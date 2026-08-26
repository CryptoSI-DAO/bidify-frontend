# Bidify V2 — Frontend

Auction UI for the [Bidify V2](https://github.com/CryptoSI-DAO/bidify-contracts)
escrow contracts across five chains:

| Network | chainId | Contract |
|---|---|---|
| Ethereum | 1 | `0xf8fE2A29F141eA2E3C12d925d33333A68bF2F0d8` |
| BNB Chain | 56 | `0xf8fE2A29F141eA2E3C12d925d33333A68bF2F0d8` |
| Arbitrum | 42161 | `0xf8fE2A29F141eA2E3C12d925d33333A68bF2F0d8` |
| Base | 8453 | `0xf8fE2A29F141eA2E3C12d925d33333A68bF2F0d8` |
| Robinhood Chain | 4663 | `0x0cF1d5B39C0d8612Cf8057A5761Fb1A875E8FDa2` |

Fork of the original Robbie-FE (CRA/React 17), modernised:

- **No backend database.** Auction data is chain-derived: the serverless API
  (`server/index.js` → `/api/*`) rebuilds auctions from `ListingCreated` /
  `Bid` / `AuctionFinished` logs and live `getListing()` state, with NFT
  metadata fetched via `tokenURI`. Works uniformly on all five chains, zero
  API keys. Public multi-RPC failover per chain (drpc/meowrpc/publicnode/…).
- **Build on modern Node** (18–22): `node-sass` → `sass` (dart-sass), legacy
  packages dropped, OpenSSL legacy provider baked into `npm run build`.
- **Image gateway hook**: set `REACT_APP_IMAGE_WORKER` (and/or `IMAGE_WORKER`
  server-side) to route NFT images through a Cloudflare worker
  (`{worker}/img?url=…`). Unset = direct IPFS/Arweave/HTTP.

## Develop

```bash
npm install
npm start
```

## Deploy (Vercel)

CRA static build + one serverless function. `vercel.json` rewrites `/api/*`
to `server/index.js`. No env vars required; see `.env.example` for optional
tuning.

## API surface (legacy Robbie-BE compatible)

- `GET /api/auctions?chainId=` — active auctions (chain-derived)
- `GET /api/auctions/:id?network=` — single auction state + metadata
- `GET /api/collection?chainId=&owner=` — owner's active listings
- `GET /api/collection/:platform/:tokenId?chainId=` — NFT metadata
- `GET /api/health` — per-chain RPC probe
- legacy cache writes (`POST/PUT /auctions`, `/admin*`) — accepted no-ops
