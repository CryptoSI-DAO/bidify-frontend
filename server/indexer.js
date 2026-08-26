// Bidify V2 chain-derived indexer — shared library for serverless functions.
// No database: auctions are reconstructed from ListingCreated / Bid /
// AuctionFinished logs, enriched with live getListing() state and NFT metadata
// via tokenURI. Works uniformly across all five chains.

export const CHAINS = {
  1: {
    name: "ethereum", symbol: "ETH",
    rpcs: ["https://eth.drpc.org", "https://eth.llamarpc.com", "https://rpc.flashbots.net"],
    addr: "0xf8fE2A29F141eA2E3C12d925d33333A68bF2F0d8",
    deployBlock: 25840475,
  },
  56: {
    name: "bnb", symbol: "BNB",
    rpcs: ["https://bsc.meowrpc.com", "https://bsc.blockpi.network/v1/rpc/public", "https://bsc.drpc.org", "https://bsc-dataseed.bnbchain.org"],
    addr: "0xf8fE2A29F141eA2E3C12d925d33333A68bF2F0d8",
    deployBlock: 118223374,
  },
  42161: {
    name: "arbitrum", symbol: "ETH",
    rpcs: ["https://arbitrum.drpc.org", "https://arb1.arbitrum.io/rpc", "https://arbitrum.meowrpc.com"],
    addr: "0xf8fE2A29F141eA2E3C12d925d33333A68bF2F0d8",
    deployBlock: 498633878,
  },
  8453: {
    name: "base", symbol: "ETH",
    rpcs: ["https://base.drpc.org", "https://mainnet.base.org", "https://base.meowrpc.com"],
    addr: "0xf8fE2A29F141eA2E3C12d925d33333A68bF2F0d8",
    deployBlock: 50486026,
  },
  4663: {
    name: "robinhood", symbol: "ETH",
    rpcs: ["https://rpc.mainnet.chain.robinhood.com", "https://rpc.arrowrpc.com"],
    addr: "0x0cF1d5B39C0d8612Cf8057A5761Fb1A875E8FDa2",
    deployBlock: 46722561,
  },
};

// keccak256 topic0 — computed with foundry cast from the V2 ABI
export const TOPICS = {
  ListingCreated: "0xb8160cd5a5d5f01ed9352faa7324b9df403f9c15c1ed9ba8cb8ee8ddbd50b748",
  Bid: "0x4c3c1c767fe4a41c6b19602745478b39af5f2a01becc2a37fb82291014d72770",
  AuctionFinished: "0xb78855d635dc85f7e40710ac78f3e31deb7f450cde53401783bc430e49cb22ce",
  AuctionExtended: "0xb4a60ebc2cf1c50677776bb7f2aea10caa932a042d60d2ac4697ef6d9cb8afb0",
};

const ZERO_ADDR = "0x0000000000000000000000000000000000000000";
const SEL_GETLISTING = "0x107a274a"; // getListing(uint256)
const SEL_TOKENURI_721 = "0xc87b56dd"; // tokenURI(uint256)
const SEL_URI_1155 = "0x0e89341c"; // uri(uint256)

// ─── JSON-RPC helpers ────────────────────────────────────────────
// Multi-RPC failover: try each endpoint in order; on 429/403/5xx/network
// errors rotate to the next. One full pass retry after a cool-down.
async function rpcOnce(url, method, params) {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json", "User-Agent": "bidify-v2/1.0" },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
  });
  if (!res.ok) throw new Error(`http ${res.status}`);
  const j = await res.json();
  if (j.error) throw new Error(j.error.message);
  return j.result;
}

async function rpc(chainId, method, params) {
  const c = CHAINS[chainId];
  let lastErr;
  for (let pass = 0; pass < 2; pass++) {
    for (const url of c.rpcs) {
      try {
        return await rpcOnce(url, method, params);
      } catch (e) {
        lastErr = new Error(`${c.name} ${method}: ${e.message}`);
        await new Promise((r) => setTimeout(r, 250 * (pass + 1)));
      }
    }
  }
  throw lastErr;
}

async function latestBlock(chainId) {
  return parseInt(await rpc(chainId, "eth_blockNumber", []), 16);
}

// eth_getLogs with chunking (Base caps ranges at 10k) + halving retry.
async function getLogs(chainId, from, to, extra = {}) {
  const CHUNK = 9000;
  const out = [];
  for (let start = from; start <= to; start += CHUNK) {
    const end = Math.min(start + CHUNK - 1, to);
    const filter = {
      address: CHAINS[chainId].addr,
      fromBlock: hex(from),
      toBlock: hex(end),
      ...extra,
    };
    try {
      out.push(...(await rpc(chainId, "eth_getLogs", [filter])));
    } catch (e) {
      if (end - start > 2000) {
        const mid = Math.floor((start + end) / 2);
        out.push(...(await getLogs(chainId, start, mid, extra)));
        out.push(...(await getLogs(chainId, mid + 1, end, extra)));
      } else {
        throw e;
      }
    }
  }
  return out;
}

const hex = (n) => "0x" + n.toString(16);
const topicAddr = (t) => (t ? "0x" + t.slice(26) : null);
const topicNum = (t) => (t ? BigInt(t).toString(10) : null);
const word = (data, i) => {
  const d = data.replace(/^0x/, "");
  return d.slice(i * 64, i * 64 + 64);
};
const wAddr = (w) => "0x" + (w || "").slice(24).padStart(40, "0");
const wNum = (w) => (w ? BigInt("0x" + w).toString(10) : null);

// ─── Event decoding ──────────────────────────────────────────────
// ListingCreated(uint64 indexed id, address indexed creator, address currency,
//   address indexed platform, uint256 token, uint256 price, uint256 endingPrice,
//   uint8 timeInDays, address lister)
function decodeListingCreated(l) {
  return {
    id: topicNum(l.topics[1]),
    creator: topicAddr(l.topics[2]),
    platform: topicAddr(l.topics[3]),
    currency: wAddr(word(l.data, 0)),
    token: wNum(word(l.data, 1)),
    price: wNum(word(l.data, 2)),
    endingPrice: wNum(word(l.data, 3)),
    timeInDays: wNum(word(l.data, 4)),
    lister: wAddr(word(l.data, 5)),
    txHash: l.transactionHash,
    block: parseInt(l.blockNumber, 16),
  };
}

// Bid(uint64 indexed id, address indexed bidder, uint256 price, address referrer)
// — decoded inline in getAuctionsForChain below.

// ─── State reads ─────────────────────────────────────────────────
// getListing(id) returns struct {
//   creator, currency, platform, token, price, endingPrice, referrer,
//   lister, highBidder, endTime, paidOut, isERC721 }
// — 12 head words (static struct).
export async function getListingState(chainId, id) {
  const data = SEL_GETLISTING + BigInt(id).toString(16).padStart(64, "0");
  const ret = await rpc(chainId, "eth_call", [{ to: CHAINS[chainId].addr, data }, "latest"]);
  if (!ret || ret === "0x") return null;
  const words = ret.replace(/^0x/, "").match(/.{64}/g) || [];
  if (words.length < 12) return null;
  const st = {
    creator: wAddr(words[0]),
    currency: wAddr(words[1]),
    platform: wAddr(words[2]),
    token: wNum(words[3]),
    price: wNum(words[4]),
    endingPrice: wNum(words[5]),
    referrer: wAddr(words[6]),
    lister: wAddr(words[7]),
    highBidder: wAddr(words[8]),
    endTime: wNum(words[9]),
    paidOut: words[10] !== "0".repeat(64),
    isERC721: words[11] !== "0".repeat(64),
  };
  if (st.creator === ZERO_ADDR && st.lister === ZERO_ADDR) return null;
  return st;
}

// ─── Metadata ────────────────────────────────────────────────────
function normalizeUri(u) {
  if (!u) return u;
  let s = String(u).trim();
  if (s.startsWith("ipfs://")) {
    return "https://ipfs.io/ipfs/" + s.slice(7).replace(/^ipfs\//, "");
  }
  if (s.startsWith("ar://")) return "https://arweave.net/" + s.slice(5);
  return s;
}

function abiDecodeString(ret) {
  const d = ret.replace(/^0x/, "");
  const words = d.match(/.{64}/g) || [];
  if (words.length < 2) return null;
  const len = parseInt(words[1], 16);
  if (!len || len > 8192) return null;
  const bytes = d.slice(128, 128 + len * 2);
  let s = "";
  for (let i = 0; i < bytes.length; i += 2) {
    s += String.fromCharCode(parseInt(bytes.substr(i, 2), 16));
  }
  return s;
}

export async function fetchTokenUri(chainId, platform, tokenId, isERC721 = true) {
  const sel = isERC721 ? SEL_TOKENURI_721 : SEL_URI_1155;
  const data = sel + BigInt(tokenId).toString(16).padStart(64, "0");
  try {
    const ret = await rpc(chainId, "eth_call", [{ to: platform, data }, "latest"]);
    if (ret && ret !== "0x") return abiDecodeString(ret);
  } catch {}
  return null;
}

// Cloudflare image worker passthrough: when REACT_APP_IMAGE_WORKER (baked into
// the client) or IMAGE_WORKER (server) is set, image URLs are rewritten to
// route through the worker: {worker}/img?url=<encoded>
const WORKER = process.env.IMAGE_WORKER || "";

async function fetchJson(url, timeoutMs = 6000) {
  const ctl = new AbortController();
  const t = setTimeout(() => ctl.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      signal: ctl.signal,
      headers: { "User-Agent": "bidify-v2/1.0" },
      redirect: "follow",
    });
    if (!res.ok) return null;
    return await res.json().catch(() => null);
  } catch {
    return null;
  } finally {
    clearTimeout(t);
  }
}

export async function fetchNftMetadata(chainId, platform, tokenId, isERC721 = true) {
  const uri = await fetchTokenUri(chainId, platform, tokenId, isERC721);
  if (!uri) return null;
  if (uri.startsWith("data:application/json;base64,")) {
    try {
      return JSON.parse(atob(uri.slice(29)));
    } catch {
      return null;
    }
  }
  if (uri.startsWith("data:")) return null;
  const meta = await fetchJson(normalizeUri(uri));
  return meta;
}

// ─── Auction assembly ────────────────────────────────────────────
export async function getAuctionsForChain(chainId, { includeFinished = false } = {}) {
  const c = CHAINS[chainId];
  if (!c) throw new Error("unsupported chain: " + chainId);
  const head = await latestBlock(chainId);

  const [listingLogs, bidLogs] = await Promise.all([
    getLogs(chainId, c.deployBlock, head, { topics: [[TOPICS.ListingCreated]] }),
    getLogs(chainId, c.deployBlock, head, {
      topics: [[TOPICS.Bid, TOPICS.AuctionFinished, TOPICS.AuctionExtended]],
    }),
  ]);

  const bidsByAuction = {};
  const finishedIds = new Set();
  for (const l of bidLogs) {
    if (l.topics[0] === TOPICS.Bid) {
      const id = topicNum(l.topics[1]);
      (bidsByAuction[id] = bidsByAuction[id] || []).push({
        bidder: topicAddr(l.topics[2]),
        price: wNum(word(l.data, 0)),
        referrer: wAddr(word(l.data, 1)),
        txHash: l.transactionHash,
        block: parseInt(l.blockNumber, 16),
      });
    } else if (l.topics[0] === TOPICS.AuctionFinished) {
      finishedIds.add(topicNum(l.topics[1]));
    }
  }

  const out = [];
  for (const l of listingLogs.map(decodeListingCreated)) {
    if (!includeFinished && finishedIds.has(l.id)) continue;
    let state = null;
    try {
      state = await getListingState(chainId, l.id);
    } catch {}
    const meta = await fetchNftMetadata(
      chainId,
      state ? state.platform : l.platform,
      state ? state.token : l.token,
      state ? state.isERC721 : true
    ).catch(() => null);
    out.push({
      id: l.id,
      name: meta?.name || `#${(state || l).token}`,
      description: meta?.description || "",
      image: meta?.image || null,
      animation_url: meta?.animation_url || null,
      metadataUrl: meta ? "token-uri" : null,
      creator: (state || l).creator,
      owner: (state || l).lister || (state || l).creator,
      currency: (state || l).currency,
      token: (state || l).token,
      platform: (state || l).platform,
      network: Number(chainId),
      isERC721: state ? state.isERC721 : true,
      price: (state || l).price,
      endingPrice: (state || l).endingPrice,
      nextBid: state ? state.price : l.price,
      currentBid: state && state.highBidder !== ZERO_ADDR ? state.price : null,
      highBidder: state && state.highBidder !== ZERO_ADDR ? state.highBidder : null,
      bids: bidsByAuction[l.id] || [],
      endTime: state ? state.endTime : null,
      startTime: null,
      paidOut: state ? state.paidOut : false,
      referrer: (state || l).referrer || null,
      allowMarketplace: true,
      marketplace: null,
      image_cache: meta?.image || null,
      txHash: l.txHash,
      block: l.block,
    });
  }
  // newest first
  out.sort((a, b) => Number(b.id) - Number(a.id));
  return out;
}

export async function getAuctionById(chainId, id) {
  const state = await getListingState(chainId, id);
  if (!state) return null;
  const meta = await fetchNftMetadata(chainId, state.platform, state.token, state.isERC721).catch(() => null);
  return {
    id: String(id),
    name: meta?.name || `#${state.token}`,
    description: meta?.description || "",
    image: meta?.image || null,
    animation_url: meta?.animation_url || null,
    creator: state.creator,
    owner: state.lister || state.creator,
    currency: state.currency,
    token: state.token,
    platform: state.platform,
    network: Number(chainId),
    isERC721: state.isERC721,
    price: state.price,
    endingPrice: state.endingPrice,
    nextBid: state.price,
    currentBid: state.highBidder !== ZERO_ADDR ? state.price : null,
    highBidder: state.highBidder !== ZERO_ADDR ? state.highBidder : null,
    bids: [],
    endTime: state.endTime,
    startTime: null,
    paidOut: state.paidOut,
    referrer: state.referrer || null,
    allowMarketplace: true,
    marketplace: null,
  };
}
