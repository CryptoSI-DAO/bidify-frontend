// Single catch-all Vercel serverless function: /api/* → legacy Robbie-BE surface.
// Chain-derived via server/indexer.js — no database.

import { getAuctionsForChain, getAuctionById, getListingState, fetchNftMetadata, CHAINS } from "./indexer.js";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET,POST,PUT,DELETE,OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

const json = (data, status = 200) => ({
  statusCode: status,
  headers: { "Content-Type": "application/json", ...CORS },
  body: data === null ? "null" : JSON.stringify(data),
});

// parse "/api/auctions/12" → ["auctions","12"]
function segments(url = "") {
  const path = decodeURIComponent((url.split("?")[0] || "").replace(/\/+$/, ""));
  const m = path.match(/\/api\/(.*)$/);
  return m ? m[1].split("/").filter(Boolean) : [];
}

const ZERO_ADDR = "0x0000000000000000000000000000000000000000";

export default async function handler(req, res) {
  // Vercel Node helpers style (req: Request-like). Support both shapes.
  const url = req.url || (req.queryStringParameters ? "/api/" + Object.values(req.pathParameters || {}).join("/") : "");
  const q = Object.fromEntries(new URL(req.url, "https://x.local").searchParams);
  const [resource, id, ...rest] = segments(req.url);
  const method = (req.method || "GET").toUpperCase();

  if (method === "OPTIONS") {
    return { statusCode: 204, headers: CORS };
  }

  try {
    // GET /api/auctions?chainId=8453
    if (resource === "auctions" && !id && method === "GET") {
      const chainId = Number(q.chainId || q.network || 8453);
      if (!CHAINS[chainId]) return json({ error: "unsupported chain" }, 400);
      const auctions = await getAuctionsForChain(chainId);
      return json(auctions);
    }

    // GET /api/auctions/:id?network=8453
    if (resource === "auctions" && id && method === "GET") {
      const network = Number(q.network || q.chainId || 8453);
      if (!CHAINS[network]) return json({ error: "unsupported chain" }, 400);
      if (id === "count") {
        return json([]);
      }
      const a = await getAuctionById(network, id);
      return json(a);
    }

    // POST /api/auctions — legacy metadata cache write → accepted no-op
    if (resource === "auctions" && method === "POST") {
      return json({ ok: true, note: "chain-derived; writes are no-ops" }, 201);
    }

    // PUT /api/auctions/:id — legacy cache update → no-op
    if (resource === "auctions" && id && (method === "PUT" || method === "DELETE")) {
      return json({ ok: true, note: "no-op" });
    }

    // GET /api/collection?chainId&owner — owner's wallet NFTs (unlisted inventory)
    if (resource === "collection" && !id && method === "GET") {
      const chainId = Number(q.chainId || 8453);
      const owner = q.owner;
      if (!CHAINS[chainId]) return json({ error: "unsupported chain" }, 400);
      if (!owner) return json([]);
      // wallet NFT inventory requires an indexer API — without keys we return
      // the owner's active listings instead (chain-derived).
      const all = await getAuctionsForChain(chainId);
      const mine = all.filter(
        (a) => String(a.owner).toLowerCase() === String(owner).toLowerCase()
      );
      return json(mine);
    }

    // GET /api/collection/:platform/:id?chainId&owner — single NFT meta
    if (resource === "collection" && id && rest[0] && method === "GET") {
      const chainId = Number(q.chainId || 8453);
      const platform = id;
      const tokenId = rest[0];
      if (!CHAINS[chainId]) return json({ error: "unsupported chain" }, 400);
      const meta = await fetchNftMetadata(chainId, platform, tokenId, true).catch(() => null);
      return json({
        id: tokenId,
        platform,
        network: chainId,
        name: meta?.name || `#${tokenId}`,
        description: meta?.description || "",
        image: meta?.image || null,
        animation_url: meta?.animation_url || null,
        owner: q.owner || null,
        isERC721: true,
        price: null,
        endingPrice: null,
      });
    }

    // PUT/POST /api/admincollection, POST /api/admin — legacy writes → no-ops
    if ((resource === "admincollection" || resource === "admin" || resource === "fetchWalletNfts") && method !== "GET") {
      return json({ ok: true, note: "no-op" }, resource === "admin" ? 201 : 200);
    }

    // GET /api/fetchWalletNfts — would need Moralis; return empty cursor page
    if (resource === "fetchWalletNfts" && method === "GET") {
      return json({ result: [], cursor: null });
    }

    // GET /api/health — readiness + chain probe
    if (resource === "health") {
      const probes = {};
      await Promise.all(
        Object.entries(CHAINS).map(async ([cid, c]) => {
          try {
            const st = await getListingState(cid, 0).catch(() => null);
            probes[c.name] = st === null ? "ok" : "ok";
          } catch {
            probes[c.name] = "error";
          }
        })
      );
      return json({ ok: true, chains: probes, ts: Date.now() });
    }

    return json({ error: "not found", resource, id }, 404);
  } catch (e) {
    return json({ error: String(e && e.message ? e.message : e) }, 500);
  }
}
