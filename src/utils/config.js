// Bidify V2 — chain configuration
// Live contracts verified 2026-08-26: owner 0x0B17…158 on all chains.
// ETH/Base/BNB/Arbitrum share deterministic address 0xf8fE…F0d8;
// Robinhood Chain differs (nonce offset at deploy — see bidify-contracts README).

import logo_eth from "../assets/logo/bidifylogo_eth.png";
import logo_base from "../assets/logo/bidifylogo_base.png";
import logo_bnb from "../assets/logo/bidifylogo_bsc.png";
import logo_arbitrum from "../assets/logo/bidifylogo_arbitrum.png";
import logo_robinhood from "../assets/logo/bidifylogo_robinhood.png";

// ─── Image gateway ───────────────────────────────────────────────
// Swap-in point for the Cloudflare image worker. Set REACT_APP_IMAGE_WORKER
// to a worker base URL (no trailing slash) and every NFT image + metadata
// fetch routes through it:
//   https://<worker>/img?url=<encoded>   for images
//   https://<worker>/meta?url=<encoded>  for tokenURI/metadata JSON
// Leave unset to use public IPFS/HTTP gateways directly.
export const IMAGE_WORKER = process.env.REACT_APP_IMAGE_WORKER || "";

export function imageUrl(raw) {
  if (!raw) return raw;
  if (IMAGE_WORKER) {
    return `${IMAGE_WORKER}/img?url=${encodeURIComponent(raw)}`;
  }
  return normalizeUri(raw);
}

export function normalizeUri(raw) {
  if (!raw) return raw;
  let u = raw.trim();
  if (u.startsWith("ipfs://")) {
    return `https://ipfs.io/ipfs/${u.slice(7).replace(/^ipfs\//, "")}`;
  }
  if (u.startsWith("ar://")) {
    return `https://arweave.net/${u.slice(5)}`;
  }
  return u;
}

// ─── API base ────────────────────────────────────────────────────
export const baseUrl = "/api";

// ─── Networks ────────────────────────────────────────────────────
export const NetworkId = {
  ETH: 1,
  BNB: 56,
  ARBITRUM: 42161,
  BASE: 8453,
  ROBINHOOD: 4663,
};

export const NeworkOrder = [
  NetworkId.ETH,
  NetworkId.BNB,
  NetworkId.ARBITRUM,
  NetworkId.BASE,
  NetworkId.ROBINHOOD,
];

export const NetworkData = {
  [NetworkId.ETH]: {
    symbol: "ETH",
    id: "1",
    name: "ETHEREUM",
    color: "#627eea",
    logo: logo_eth,
    explorer: "https://etherscan.io",
  },
  [NetworkId.BNB]: {
    symbol: "BNB",
    id: "56",
    name: "BNB CHAIN",
    color: "#FCD535",
    logo: logo_bnb,
    explorer: "https://bscscan.com",
  },
  [NetworkId.ARBITRUM]: {
    symbol: "ETH",
    id: "42161",
    name: "ARBITRUM",
    color: "#12aaff",
    logo: logo_arbitrum,
    explorer: "https://arbiscan.io",
  },
  [NetworkId.BASE]: {
    symbol: "ETH",
    id: "8453",
    name: "BASE",
    color: "#0052ff",
    logo: logo_base,
    explorer: "https://basescan.org",
  },
  [NetworkId.ROBINHOOD]: {
    symbol: "ETH",
    id: "4663",
    name: "ROBINHOOD CHAIN",
    color: "#00c805",
    logo: logo_robinhood,
    explorer: "https://robinhoodchain.blockscout.com",
  },
};

export const getSymbol = (chainId) => {
  const net = NetworkData[Number(chainId)];
  return net ? net.symbol : "ETH";
};

export const supportedChainIds = [
  NetworkId.ETH,
  NetworkId.BNB,
  NetworkId.ARBITRUM,
  NetworkId.BASE,
  NetworkId.ROBINHOOD,
];

export const EXPLORER = Object.fromEntries(
  Object.entries(NetworkData).map(([k, v]) => [k, v.explorer])
);

// Public JSON-RPC endpoints (no API keys).
export const URLS = {
  [NetworkId.ETH]: "https://ethereum-rpc.publicnode.com",
  [NetworkId.BNB]: "https://bsc-dataseed.bnbchain.org",
  [NetworkId.ARBITRUM]: "https://arbitrum-one-rpc.publicnode.com",
  [NetworkId.BASE]: "https://base-rpc.publicnode.com",
  [NetworkId.ROBINHOOD]: "https://rpc.mainnet.chain.robinhood.com",
};

// ─── Bidify V2 contract ──────────────────────────────────────────
export const BIDIFY = {
  address: {
    [NetworkId.ETH]: "0xf8fE2A29F141eA2E3C12d925d33333A68bF2F0d8",
    [NetworkId.BNB]: "0xf8fE2A29F141eA2E3C12d925d33333A68bF2F0d8",
    [NetworkId.ARBITRUM]: "0xf8fE2A29F141eA2E3C12d925d33333A68bF2F0d8",
    [NetworkId.BASE]: "0xf8fE2A29F141eA2E3C12d925d33333A68bF2F0d8",
    [NetworkId.ROBINHOOD]: "0x0cF1d5B39C0d8612Cf8057A5761Fb1A875E8FDa2",
  },
  abi: [{"type":"constructor","inputs":[{"name":"_feeRecipient","type":"address","internalType":"address"}],"stateMutability":"nonpayable"},{"type":"fallback","stateMutability":"payable"},{"type":"receive","stateMutability":"payable"},{"type":"function","name":"bid","inputs":[{"name":"id","type":"uint64","internalType":"uint64"},{"name":"referrer","type":"address","internalType":"address"},{"name":"amount","type":"uint256","internalType":"uint256"}],"outputs":[],"stateMutability":"payable"},{"type":"function","name":"feeRecipient","inputs":[],"outputs":[{"name":"","type":"address","internalType":"address"}],"stateMutability":"view"},{"type":"function","name":"finish","inputs":[{"name":"id","type":"uint64","internalType":"uint64"}],"outputs":[],"stateMutability":"nonpayable"},{"type":"function","name":"getListing","inputs":[{"name":"id","type":"uint256","internalType":"uint256"}],"outputs":[{"name":"","type":"tuple","internalType":"struct Bidify.Listing","components":[{"name":"creator","type":"address","internalType":"address"},{"name":"currency","type":"address","internalType":"address"},{"name":"platform","type":"address","internalType":"address"},{"name":"token","type":"uint256","internalType":"uint256"},{"name":"price","type":"uint256","internalType":"uint256"},{"name":"endingPrice","type":"uint256","internalType":"uint256"},{"name":"referrer","type":"address","internalType":"address"},{"name":"lister","type":"address","internalType":"address"},{"name":"highBidder","type":"address","internalType":"address"},{"name":"endTime","type":"uint256","internalType":"uint256"},{"name":"paidOut","type":"bool","internalType":"bool"},{"name":"isERC721","type":"bool","internalType":"bool"}]}],"stateMutability":"view"},{"type":"function","name":"getNextBid","inputs":[{"name":"id","type":"uint64","internalType":"uint64"}],"outputs":[{"name":"","type":"uint256","internalType":"uint256"}],"stateMutability":"view"},{"type":"function","name":"getNextListingId","inputs":[],"outputs":[{"name":"","type":"uint64","internalType":"uint64"}],"stateMutability":"view"},{"type":"function","name":"getPriceUnit","inputs":[{"name":"currency","type":"address","internalType":"address"}],"outputs":[{"name":"","type":"uint256","internalType":"uint256"}],"stateMutability":"view"},{"type":"function","name":"list","inputs":[{"name":"currency","type":"address","internalType":"address"},{"name":"platform","type":"address","internalType":"address"},{"name":"token","type":"uint256","internalType":"uint256"},{"name":"price","type":"uint256","internalType":"uint256"},{"name":"endingPrice","type":"uint256","internalType":"uint256"},{"name":"timeInDays","type":"uint8","internalType":"uint8"},{"name":"isERC721","type":"bool","internalType":"bool"},{"name":"lister","type":"address","internalType":"address"}],"outputs":[{"name":"","type":"uint256","internalType":"uint256"}],"stateMutability":"nonpayable"},{"type":"function","name":"onERC1155BatchReceived","inputs":[{"name":"","type":"address","internalType":"address"},{"name":"","type":"address","internalType":"address"},{"name":"","type":"uint256[]","internalType":"uint256[]"},{"name":"","type":"uint256[]","internalType":"uint256[]"},{"name":"","type":"bytes","internalType":"bytes"}],"outputs":[{"name":"","type":"bytes4","internalType":"bytes4"}],"stateMutability":"nonpayable"},{"type":"function","name":"onERC1155Received","inputs":[{"name":"operator","type":"address","internalType":"address"},{"name":"","type":"address","internalType":"address"},{"name":"tokenId","type":"uint256","internalType":"uint256"},{"name":"","type":"bytes","internalType":"bytes"}],"outputs":[{"name":"","type":"bytes4","internalType":"bytes4"}],"stateMutability":"nonpayable"},{"type":"function","name":"onERC1155Received","inputs":[{"name":"","type":"address","internalType":"address"},{"name":"","type":"address","internalType":"address"},{"name":"","type":"uint256","internalType":"uint256"},{"name":"","type":"uint256","internalType":"uint256"},{"name":"","type":"bytes","internalType":"bytes"}],"outputs":[{"name":"","type":"bytes4","internalType":"bytes4"}],"stateMutability":"nonpayable"},{"type":"function","name":"onERC721Received","inputs":[{"name":"operator","type":"address","internalType":"address"},{"name":"","type":"address","internalType":"address"},{"name":"tokenId","type":"uint256","internalType":"uint256"},{"name":"","type":"bytes","internalType":"bytes"}],"outputs":[{"name":"","type":"bytes4","internalType":"bytes4"}],"stateMutability":"nonpayable"},{"type":"function","name":"owner","inputs":[],"outputs":[{"name":"","type":"address","internalType":"address"}],"stateMutability":"view"},{"type":"function","name":"renounceOwnership","inputs":[],"outputs":[],"stateMutability":"nonpayable"},{"type":"function","name":"supportsInterface","inputs":[{"name":"interfaceId","type":"bytes4","internalType":"bytes4"}],"outputs":[{"name":"","type":"bool","internalType":"bool"}],"stateMutability":"view"},{"type":"function","name":"transferOwnership","inputs":[{"name":"newOwner","type":"address","internalType":"address"}],"outputs":[],"stateMutability":"nonpayable"},{"type":"event","name":"AuctionExtended","inputs":[{"name":"id","type":"uint64","indexed":true,"internalType":"uint64"},{"name":"time","type":"uint256","indexed":false,"internalType":"uint256"}],"anonymous":false},{"type":"event","name":"AuctionFinished","inputs":[{"name":"id","type":"uint64","indexed":true,"internalType":"uint64"},{"name":"nftRecipient","type":"address","indexed":true,"internalType":"address"},{"name":"price","type":"uint256","indexed":false,"internalType":"uint256"}],"anonymous":false},{"type":"event","name":"Bid","inputs":[{"name":"id","type":"uint64","indexed":true,"internalType":"uint64"},{"name":"bidder","type":"address","indexed":true,"internalType":"address"},{"name":"price","type":"uint256","indexed":false,"internalType":"uint256"},{"name":"referrer","type":"address","indexed":false,"internalType":"address"}],"anonymous":false},{"type":"event","name":"FeeRecipientChanged","inputs":[{"name":"oldRecipient","type":"address","indexed":true,"internalType":"address"},{"name":"newRecipient","type":"address","indexed":true,"internalType":"address"}],"anonymous":false},{"type":"event","name":"ListingCreated","inputs":[{"name":"id","type":"uint64","indexed":true,"internalType":"uint64"},{"name":"creator","type":"address","indexed":true,"internalType":"address"},{"name":"currency","type":"address","indexed":false,"internalType":"address"},{"name":"platform","type":"address","indexed":true,"internalType":"address"},{"name":"token","type":"uint256","indexed":false,"internalType":"uint256"},{"name":"price","type":"uint256","indexed":false,"internalType":"uint256"},{"name":"endingPrice","type":"uint256","indexed":false,"internalType":"uint256"},{"name":"timeInDays","type":"uint8","indexed":false,"internalType":"uint8"},{"name":"lister","type":"address","indexed":false,"internalType":"address"}],"anonymous":false},{"type":"event","name":"OwnershipTransferred","inputs":[{"name":"previousOwner","type":"address","indexed":true,"internalType":"address"},{"name":"newOwner","type":"address","indexed":true,"internalType":"address"}],"anonymous":false},{"type":"error","name":"OwnableInvalidOwner","inputs":[{"name":"owner","type":"address","internalType":"address"}]},{"type":"error","name":"OwnableUnauthorizedAccount","inputs":[{"name":"account","type":"address","internalType":"address"}]},{"type":"error","name":"ReentrancyGuardReentrantCall","inputs":[]},{"type":"error","name":"SafeERC20FailedOperation","inputs":[{"name":"token","type":"address","internalType":"address"}]}],
};

// Legacy exports kept for unmodified consumers.
export const snowApi = {};
export const getLogUrl = {};


// ERC20 ABI (currency introspection) — from original Robbie config
export const BIT = {
  //WETH
  address: {
    [NetworkId.EGEM]: "0xE5fca20e55811D461800A853f444FBC6f5B72BEa",
  },
  abi: [
    {
      inputs: [
        {
          internalType: "uint256",
          name: "amount",
          type: "uint256",
        },
      ],
      name: "_mint",
      outputs: [],
      stateMutability: "nonpayable",
      type: "function",
    },
    {
      inputs: [
        {
          internalType: "uint8",
          name: "decimals_",
          type: "uint8",
        },
      ],
      stateMutability: "nonpayable",
      type: "constructor",
    },
    {
      anonymous: false,
      inputs: [
        {
          indexed: true,
          internalType: "address",
          name: "owner",
          type: "address",
        },
        {
          indexed: true,
          internalType: "address",
          name: "spender",
          type: "address",
        },
        {
          indexed: false,
          internalType: "uint256",
          name: "value",
          type: "uint256",
        },
      ],
      name: "Approval",
      type: "event",
    },
    {
      inputs: [
        {
          internalType: "address",
          name: "spender",
          type: "address",
        },
        {
          internalType: "uint256",
          name: "amount",
          type: "uint256",
        },
      ],
      name: "approve",
      outputs: [
        {
          internalType: "bool",
          name: "",
          type: "bool",
        },
      ],
      stateMutability: "nonpayable",
      type: "function",
    },
    {
      inputs: [
        {
          internalType: "address",
          name: "spender",
          type: "address",
        },
        {
          internalType: "uint256",
          name: "subtractedValue",
          type: "uint256",
        },
      ],
      name: "decreaseAllowance",
      outputs: [
        {
          internalType: "bool",
          name: "",
          type: "bool",
        },
      ],
      stateMutability: "nonpayable",
      type: "function",
    },
    {
      inputs: [
        {
          internalType: "address",
          name: "spender",
          type: "address",
        },
        {
          internalType: "uint256",
          name: "addedValue",
          type: "uint256",
        },
      ],
      name: "increaseAllowance",
      outputs: [
        {
          internalType: "bool",
          name: "",
          type: "bool",
        },
      ],
      stateMutability: "nonpayable",
      type: "function",
    },
    {
      inputs: [
        {
          internalType: "address",
          name: "recipient",
          type: "address",
        },
        {
          internalType: "uint256",
          name: "amount",
          type: "uint256",
        },
      ],
      name: "transfer",
      outputs: [
        {
          internalType: "bool",
          name: "",
          type: "bool",
        },
      ],
      stateMutability: "nonpayable",
      type: "function",
    },
    {
      anonymous: false,
      inputs: [
        {
          indexed: true,
          internalType: "address",
          name: "from",
          type: "address",
        },
        {
          indexed: true,
          internalType: "address",
          name: "to",
          type: "address",
        },
        {
          indexed: false,
          internalType: "uint256",
          name: "value",
          type: "uint256",
        },
      ],
      name: "Transfer",
      type: "event",
    },
    {
      inputs: [
        {
          internalType: "address",
          name: "sender",
          type: "address",
        },
        {
          internalType: "address",
          name: "recipient",
          type: "address",
        },
        {
          internalType: "uint256",
          name: "amount",
          type: "uint256",
        },
      ],
      name: "transferFrom",
      outputs: [
        {
          internalType: "bool",
          name: "",
          type: "bool",
        },
      ],
      stateMutability: "nonpayable",
      type: "function",
    },
    {
      inputs: [
        {
          internalType: "address",
          name: "owner",
          type: "address",
        },
        {
          internalType: "address",
          name: "spender",
          type: "address",
        },
      ],
      name: "allowance",
      outputs: [
        {
          internalType: "uint256",
          name: "",
          type: "uint256",
        },
      ],
      stateMutability: "view",
      type: "function",
    },
    {
      inputs: [
        {
          internalType: "address",
          name: "account",
          type: "address",
        },
      ],
      name: "balanceOf",
      outputs: [
        {
          internalType: "uint256",
          name: "",
          type: "uint256",
        },
      ],
      stateMutability: "view",
      type: "function",
    },
    {
      inputs: [],
      name: "decimals",
      outputs: [
        {
          internalType: "uint8",
          name: "",
          type: "uint8",
        },
      ],
      stateMutability: "view",
      type: "function",
    },
    {
      inputs: [],
      name: "name",
      outputs: [
        {
          internalType: "string",
          name: "",
          type: "string",
        },
      ],
      stateMutability: "view",
      type: "function",
    },
    {
      inputs: [],
      name: "symbol",
      outputs: [
        {
          internalType: "string",
          name: "",
          type: "string",
        },
      ],
      stateMutability: "view",
      type: "function",
    },
    {
      inputs: [],
      name: "totalSupply",
      outputs: [
        {
          internalType: "uint256",
          name: "",
          type: "uint256",
        },
      ],
      stateMutability: "view",
      type: "function",
    },
  ],
};


// ERC721 ABI — from original Robbie config
export const ERC721 = {
  address: "0xA6642FaAEaB5142CBB3636BA00319Bc46306eb3E",
  abi: [
    {
      anonymous: false,
      inputs: [
        {
          indexed: true,
          internalType: "address",
          name: "owner",
          type: "address",
        },
        {
          indexed: true,
          internalType: "address",
          name: "approved",
          type: "address",
        },
        {
          indexed: true,
          internalType: "uint256",
          name: "tokenId",
          type: "uint256",
        },
      ],
      name: "Approval",
      type: "event",
    },
    {
      anonymous: false,
      inputs: [
        {
          indexed: true,
          internalType: "address",
          name: "owner",
          type: "address",
        },
        {
          indexed: true,
          internalType: "address",
          name: "operator",
          type: "address",
        },
        {
          indexed: false,
          internalType: "bool",
          name: "approved",
          type: "bool",
        },
      ],
      name: "ApprovalForAll",
      type: "event",
    },
    {
      anonymous: false,
      inputs: [
        {
          indexed: true,
          internalType: "address",
          name: "from",
          type: "address",
        },
        {
          indexed: true,
          internalType: "address",
          name: "to",
          type: "address",
        },
        {
          indexed: true,
          internalType: "uint256",
          name: "tokenId",
          type: "uint256",
        },
      ],
      name: "Transfer",
      type: "event",
    },
    {
      inputs: [
        {
          internalType: "address",
          name: "to",
          type: "address",
        },
        {
          internalType: "uint256",
          name: "tokenId",
          type: "uint256",
        },
      ],
      name: "approve",
      outputs: [],
      stateMutability: "nonpayable",
      type: "function",
    },
    {
      inputs: [
        {
          internalType: "address",
          name: "owner",
          type: "address",
        },
      ],
      name: "balanceOf",
      outputs: [
        {
          internalType: "uint256",
          name: "",
          type: "uint256",
        },
      ],
      stateMutability: "view",
      type: "function",
    },
    {
      inputs: [],
      name: "baseURI",
      outputs: [
        {
          internalType: "string",
          name: "",
          type: "string",
        },
      ],
      stateMutability: "view",
      type: "function",
    },
    {
      inputs: [
        {
          internalType: "string",
          name: "",
          type: "string",
        },
      ],
      name: "counterfeit",
      outputs: [
        {
          internalType: "uint8",
          name: "",
          type: "uint8",
        },
      ],
      stateMutability: "view",
      type: "function",
    },
    {
      inputs: [
        {
          internalType: "address",
          name: "_to",
          type: "address",
        },
        {
          internalType: "string",
          name: "_file",
          type: "string",
        },
        {
          internalType: "string",
          name: "_metadata",
          type: "string",
        },
      ],
      name: "createNFT",
      outputs: [
        {
          internalType: "uint256",
          name: "",
          type: "uint256",
        },
      ],
      stateMutability: "nonpayable",
      type: "function",
    },
    {
      inputs: [
        {
          internalType: "uint256",
          name: "tokenId",
          type: "uint256",
        },
      ],
      name: "getApproved",
      outputs: [
        {
          internalType: "address",
          name: "",
          type: "address",
        },
      ],
      stateMutability: "view",
      type: "function",
    },
    {
      inputs: [
        {
          internalType: "address",
          name: "owner",
          type: "address",
        },
        {
          internalType: "address",
          name: "operator",
          type: "address",
        },
      ],
      name: "isApprovedForAll",
      outputs: [
        {
          internalType: "bool",
          name: "",
          type: "bool",
        },
      ],
      stateMutability: "view",
      type: "function",
    },
    {
      inputs: [],
      name: "name",
      outputs: [
        {
          internalType: "string",
          name: "",
          type: "string",
        },
      ],
      stateMutability: "view",
      type: "function",
    },
    {
      inputs: [
        {
          internalType: "uint256",
          name: "tokenId",
          type: "uint256",
        },
      ],
      name: "ownerOf",
      outputs: [
        {
          internalType: "address",
          name: "",
          type: "address",
        },
      ],
      stateMutability: "view",
      type: "function",
    },
    {
      inputs: [
        {
          internalType: "address",
          name: "from",
          type: "address",
        },
        {
          internalType: "address",
          name: "to",
          type: "address",
        },
        {
          internalType: "uint256",
          name: "tokenId",
          type: "uint256",
        },
      ],
      name: "safeTransferFrom",
      outputs: [],
      stateMutability: "nonpayable",
      type: "function",
    },
    {
      inputs: [
        {
          internalType: "address",
          name: "from",
          type: "address",
        },
        {
          internalType: "address",
          name: "to",
          type: "address",
        },
        {
          internalType: "uint256",
          name: "tokenId",
          type: "uint256",
        },
        {
          internalType: "bytes",
          name: "_data",
          type: "bytes",
        },
      ],
      name: "safeTransferFrom",
      outputs: [],
      stateMutability: "nonpayable",
      type: "function",
    },
    {
      inputs: [
        {
          internalType: "address",
          name: "operator",
          type: "address",
        },
        {
          internalType: "bool",
          name: "approved",
          type: "bool",
        },
      ],
      name: "setApprovalForAll",
      outputs: [],
      stateMutability: "nonpayable",
      type: "function",
    },
    {
      inputs: [
        {
          internalType: "bytes4",
          name: "interfaceId",
          type: "bytes4",
        },
      ],
      name: "supportsInterface",
      outputs: [
        {
          internalType: "bool",
          name: "",
          type: "bool",
        },
      ],
      stateMutability: "view",
      type: "function",
    },
    {
      inputs: [],
      name: "symbol",
      outputs: [
        {
          internalType: "string",
          name: "",
          type: "string",
        },
      ],
      stateMutability: "view",
      type: "function",
    },
    {
      inputs: [
        {
          internalType: "uint256",
          name: "index",
          type: "uint256",
        },
      ],
      name: "tokenByIndex",
      outputs: [
        {
          internalType: "uint256",
          name: "",
          type: "uint256",
        },
      ],
      stateMutability: "view",
      type: "function",
    },
    {
      inputs: [
        {
          internalType: "address",
          name: "owner",
          type: "address",
        },
        {
          internalType: "uint256",
          name: "index",
          type: "uint256",
        },
      ],
      name: "tokenOfOwnerByIndex",
      outputs: [
        {
          internalType: "uint256",
          name: "",
          type: "uint256",
        },
      ],
      stateMutability: "view",
      type: "function",
    },
    {
      inputs: [
        {
          internalType: "uint256",
          name: "tokenId",
          type: "uint256",
        },
      ],
      name: "tokenURI",
      outputs: [
        {
          internalType: "string",
          name: "",
          type: "string",
        },
      ],
      stateMutability: "view",
      type: "function",
    },
    {
      inputs: [],
      name: "totalSupply",
      outputs: [
        {
          internalType: "uint256",
          name: "",
          type: "uint256",
        },
      ],
      stateMutability: "view",
      type: "function",
    },
    {
      inputs: [
        {
          internalType: "address",
          name: "from",
          type: "address",
        },
        {
          internalType: "address",
          name: "to",
          type: "address",
        },
        {
          internalType: "uint256",
          name: "tokenId",
          type: "uint256",
        },
      ],
      name: "transferFrom",
      outputs: [],
      stateMutability: "nonpayable",
      type: "function",
    },
  ],
};

// ERC1155 ABI — from original Robbie config
export const ERC1155 = {
  abi: [
    {
      inputs: [
        {
          internalType: "string",
          name: "uri_",
          type: "string",
        },
      ],
      stateMutability: "nonpayable",
      type: "constructor",
    },
    {
      anonymous: false,
      inputs: [
        {
          indexed: true,
          internalType: "address",
          name: "account",
          type: "address",
        },
        {
          indexed: true,
          internalType: "address",
          name: "operator",
          type: "address",
        },
        {
          indexed: false,
          internalType: "bool",
          name: "approved",
          type: "bool",
        },
      ],
      name: "ApprovalForAll",
      type: "event",
    },
    {
      anonymous: false,
      inputs: [
        {
          indexed: true,
          internalType: "address",
          name: "operator",
          type: "address",
        },
        {
          indexed: true,
          internalType: "address",
          name: "from",
          type: "address",
        },
        {
          indexed: true,
          internalType: "address",
          name: "to",
          type: "address",
        },
        {
          indexed: false,
          internalType: "uint256[]",
          name: "ids",
          type: "uint256[]",
        },
        {
          indexed: false,
          internalType: "uint256[]",
          name: "values",
          type: "uint256[]",
        },
      ],
      name: "TransferBatch",
      type: "event",
    },
    {
      anonymous: false,
      inputs: [
        {
          indexed: true,
          internalType: "address",
          name: "operator",
          type: "address",
        },
        {
          indexed: true,
          internalType: "address",
          name: "from",
          type: "address",
        },
        {
          indexed: true,
          internalType: "address",
          name: "to",
          type: "address",
        },
        {
          indexed: false,
          internalType: "uint256",
          name: "id",
          type: "uint256",
        },
        {
          indexed: false,
          internalType: "uint256",
          name: "value",
          type: "uint256",
        },
      ],
      name: "TransferSingle",
      type: "event",
    },
    {
      anonymous: false,
      inputs: [
        {
          indexed: false,
          internalType: "string",
          name: "value",
          type: "string",
        },
        {
          indexed: true,
          internalType: "uint256",
          name: "id",
          type: "uint256",
        },
      ],
      name: "URI",
      type: "event",
    },
    {
      inputs: [
        {
          internalType: "address",
          name: "account",
          type: "address",
        },
        {
          internalType: "uint256",
          name: "id",
          type: "uint256",
        },
      ],
      name: "balanceOf",
      outputs: [
        {
          internalType: "uint256",
          name: "",
          type: "uint256",
        },
      ],
      stateMutability: "view",
      type: "function",
    },
    {
      inputs: [
        {
          internalType: "address[]",
          name: "accounts",
          type: "address[]",
        },
        {
          internalType: "uint256[]",
          name: "ids",
          type: "uint256[]",
        },
      ],
      name: "balanceOfBatch",
      outputs: [
        {
          internalType: "uint256[]",
          name: "",
          type: "uint256[]",
        },
      ],
      stateMutability: "view",
      type: "function",
    },
    {
      inputs: [
        {
          internalType: "address",
          name: "account",
          type: "address",
        },
        {
          internalType: "address",
          name: "operator",
          type: "address",
        },
      ],
      name: "isApprovedForAll",
      outputs: [
        {
          internalType: "bool",
          name: "",
          type: "bool",
        },
      ],
      stateMutability: "view",
      type: "function",
    },
    {
      inputs: [
        {
          internalType: "address",
          name: "from",
          type: "address",
        },
        {
          internalType: "address",
          name: "to",
          type: "address",
        },
        {
          internalType: "uint256[]",
          name: "ids",
          type: "uint256[]",
        },
        {
          internalType: "uint256[]",
          name: "amounts",
          type: "uint256[]",
        },
        {
          internalType: "bytes",
          name: "data",
          type: "bytes",
        },
      ],
      name: "safeBatchTransferFrom",
      outputs: [],
      stateMutability: "nonpayable",
      type: "function",
    },
    {
      inputs: [
        {
          internalType: "address",
          name: "from",
          type: "address",
        },
        {
          internalType: "address",
          name: "to",
          type: "address",
        },
        {
          internalType: "uint256",
          name: "id",
          type: "uint256",
        },
        {
          internalType: "uint256",
          name: "amount",
          type: "uint256",
        },
        {
          internalType: "bytes",
          name: "data",
          type: "bytes",
        },
      ],
      name: "safeTransferFrom",
      outputs: [],
      stateMutability: "nonpayable",
      type: "function",
    },
    {
      inputs: [
        {
          internalType: "address",
          name: "operator",
          type: "address",
        },
        {
          internalType: "bool",
          name: "approved",
          type: "bool",
        },
      ],
      name: "setApprovalForAll",
      outputs: [],
      stateMutability: "nonpayable",
      type: "function",
    },
    {
      inputs: [
        {
          internalType: "bytes4",
          name: "interfaceId",
          type: "bytes4",
        },
      ],
      name: "supportsInterface",
      outputs: [
        {
          internalType: "bool",
          name: "",
          type: "bool",
        },
      ],
      stateMutability: "view",
      type: "function",
    },
    {
      inputs: [
        {
          internalType: "uint256",
          name: "",
          type: "uint256",
        },
      ],
      name: "uri",
      outputs: [
        {
          internalType: "string",
          name: "",
          type: "string",
        },
      ],
      stateMutability: "view",
      type: "function",
    },
  ],
};
