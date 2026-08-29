# Image Worker — NFT image delivery via Cloudflare

NFT artwork on Bidify V2 can come from anywhere — IPFS, Arweave, a project's own
CDN, even a hotlink to OpenSea's image proxy. The `bidify-frontend` already
handles all of these via `normalizeUri()` in `src/utils/config.js`.

But pulling NFT images directly from those sources on every page view is slow
(200-800ms) and racy (the upstream may rate-limit, CORS-block, or 404). For
production traffic, you want a single edge-cached URL behind every `<img>` tag.

This doc covers how to plug the **Bidify image worker** into any Bidify
frontend — whether you're forking this repo, building a third-party UI, or
just running your own auction tracker.

## TL;DR

```bash
# in your .env
REACT_APP_IMAGE_WORKER=https://img.bidify.me
```

That's it. Every NFT image in the UI now flows through:

```
your browser → Cloudflare edge (img.bidify.me) → IPFS / Arweave / HTTP
                ▲ cached here on first hit
```

## What the worker does

The Bidify image worker is a small Cloudflare Worker + R2 + KV stack that:

1. **Receives** an image URL on the query string (`/img?url=…`)
2. **Fetches** the original bytes from the upstream (IPFS gateway, Arweave,
   HTTP, etc.)
3. **Caches** the original in a Cloudflare R2 bucket (content-addressed by
   SHA-256, so identical artwork is stored once even across many listings)
4. **Transforms** the cached image on demand via Cloudflare's
   `/cdn-cgi/image/<opts>/` path — resizing, quality, AVIF/WebP auto
5. **Serves** the result from Cloudflare's edge cache (300+ cities) with a
   1-year `Cache-Control: public, immutable` header

A separate **Cron Worker** (also part of the same project) periodically polls
the upstream marketplace (default: Immutable zkEVM) and pre-warms the cache for
active listings. That way the first visitor never pays the upstream fetch
latency.

## Pricing reality check

Cloudflare's Images product has a free tier that covers most Bidify use cases:

| | Free | Paid (over free tier) |
|---|---|---|
| Unique transformations / month | 5,000 | $0.50 per 1,000 |
| Images stored on Images CDN | 100,000 | $5 per 100,000 |
| Served bytes | 1,000,000 | $1 per 100,000 |

The "transformations" metric is the one that matters: each unique
`(image, params)` pair counts as one. A 320px thumbnail of artwork #42 and an
800px detail of the same artwork are **two** transformations, not one. At
typical Bidify volumes (hundreds of active listings, three sizes each) you'd
be at ~10-20% of the free tier. See [Cloudflare Images pricing](https://developers.cloudflare.com/images/pricing/)
for the latest.

> **Tip:** `format=auto` in the transform URL still counts as **one**
> transformation even if different browsers receive different encoded formats
> (AVIF vs WebP vs JPEG). This is a generous design and a major reason to use
> the worker rather than pre-baking multiple formats.

## Quick start (use the hosted worker)

The CryptoSI DAO runs a hosted image worker at `https://img.bidify.me`. Anyone
building a Bidify frontend can use it for free — there's no API key, no rate
limit (within Cloudflare's free tier), no auth.

### 1. Set the env var

```bash
# .env
REACT_APP_IMAGE_WORKER=https://img.bidify.me
```

This is picked up by `src/utils/config.js`:

```js
export const IMAGE_WORKER = process.env.REACT_APP_IMAGE_WORKER || "";

export function imageUrl(raw) {
  if (!raw) return raw;
  if (IMAGE_WORKER) {
    return `${IMAGE_WORKER}/img?url=${encodeURIComponent(raw)}`;
  }
  return normalizeUri(raw);
}
```

Every NFT image in the UI that flows through `imageUrl()` will now be
proxied through the worker. To use it in your own code:

```js
import { imageUrl } from "@/utils/config";   // CRA-style alias
// or: import { imageUrl } from "./utils/config";

const src = imageUrl("ipfs://bafy.../nft.png");
// → "https://img.bidify.me/img?url=ipfs%3A%2F%2Fbafy...%2Fnft.png"
```

### 2. For server-side rendering / API routes

The serverless indexer in `api/_lib/indexer.js` also builds image URLs (for
previews, OG cards, etc). It reads the same env var, so just set it in your
deploy environment:

```bash
# Vercel → Project Settings → Environment Variables
IMAGE_WORKER=https://img.bidify.me
```

(`IMAGE_WORKER` without the `REACT_APP_` prefix is the server-side variant;
both work and both end up at the same place.)

### 3. (Optional) Custom transform options

The hosted worker accepts the standard Cloudflare Images transform parameters
on the path. If you want a non-default size or quality, just build the URL
yourself:

```js
// default 800x quality 80
const src = `https://img.bidify.me/cdn-cgi/image/width=800,quality=80,format=auto/r2-originals/${hash}.png`;
```

Three sizes we recommend for auction UIs:

| Placement | Transform options |
|---|---|
| Grid thumbnail | `width=320,quality=75,format=auto` |
| Detail view | `width=800,quality=80,format=auto` |
| Hero / OG card | `width=1600,quality=85,format=auto` |

## Self-hosting: run your own worker

If you'd rather not depend on the CryptoSI-hosted worker, the whole stack is
small enough to fork in an afternoon. The reference implementation lives at
`bidify-spec/bidify-worker` in the CryptoSI monorepo and consists of:

```
bidify-worker/
├── wrangler.jsonc          # Cloudflare Worker config
├── src/
│   └── index.js            # both the proxy route AND the cron ingest
└── (KV + R2 + zone — provisioned in Cloudflare dashboard)
```

### Cloudflare resources you need (one-time)

| Resource | Name | Notes |
|---|---|---|
| Zone | `img.yourdomain.com` (or use the worker's `*.workers.dev` URL) | Proxied, on Cloudflare |
| DNS record | `img` (CNAME → your apex) | Proxied (orange cloud) |
| R2 bucket | `bidify-images` | Region: auto |
| KV namespace | `bidify-ingest-state` | Holds the cron cursor + per-listing image keys |
| Images plan | Free (default) | Upgrade only if you cross 5k unique transformations/month |

### Deploy steps

```bash
# install
npm install -g wrangler
cd bidify-worker
wrangler login

# create the R2 bucket (one-time)
wrangler r2 bucket create bidify-images

# create the KV namespace (one-time)
wrangler kv:namespace create STATE
# → paste the returned id into wrangler.jsonc under kv_namespaces[0].id

# deploy
wrangler deploy
```

This gives you a worker at `https://bidify-image-ingest.<your-subdomain>.workers.dev`
(or attach your `img.yourdomain.com` zone via `wrangler triggers`).

### The two worker routes

The single `src/index.js` file serves both purposes:

**1. HTTP proxy** — when a browser hits `/img?url=…`, the worker:
- Decodes the URL
- Fetches upstream (with a 10s timeout, follows 3 redirects)
- Hashes the body with SHA-256
- Stores the original in R2 (if not already present) under
  `originals/<hash>.<ext>`
- Returns the bytes with `cache-control: public, max-age=31536000, immutable`
  and a CORS header so the browser accepts the cross-origin response

**2. Cron ingest** — every 10 minutes, the scheduled handler:
- Calls the upstream marketplace API for active listings
- For each one, fetches the metadata → image URL
- Pre-warms the R2 cache so the first browser visit is instant

The HTTP proxy is what the frontend actually uses. The cron is a nice-to-have
for traffic shaping — you can skip it during development.

### Wire it up in your frontend

```bash
# .env (using your own deployment)
REACT_APP_IMAGE_WORKER=https://img.yourdomain.com
```

Or, if you're using the default `*.workers.dev` URL:

```bash
REACT_APP_IMAGE_WORKER=https://bidify-image-ingest.<your-subdomain>.workers.dev
```

## Reference

- [Cloudflare Images pricing](https://developers.cloudflare.com/images/pricing/)
  — 5,000 free transformations/month, then $0.50/1k
- [Cloudflare Images transform URL syntax](https://developers.cloudflare.com/images/transform-images/transform-via-url/)
  — `width`, `quality`, `format`, `fit`, `gravity`, …
- [Cloudflare R2](https://developers.cloudflare.com/r2/) — the storage layer
  the worker writes into
- [Wrangler CLI](https://developers.cloudflare.com/workers/wrangler/) — the
  deploy tool (`wrangler deploy`)
- Original spec (older draft, less polished): `bidify-spec/Bidify_Image_Pipeline_Spec.md`

## FAQ

**Q: Does the hosted worker log IP addresses / user agents?**
A: Yes, like every Cloudflare Worker. Logs are retained for 3 days by default
and visible only to the worker owner (CryptoSI DAO). They are not sold or
shared. If this is a concern, self-host — the worker source is fully
open and the wrangler config controls all log retention.

**Q: Can I use the worker for non-Bidify images?**
A: Technically yes, but please don't. It's a shared resource on the free tier
and we're optimising for Bidify traffic patterns. For your own NFT project,
self-host.

**Q: The upstream image returns 404 / 403 / CORS errors. What happens?**
A: The worker passes the upstream status through to the browser. The
browser's `<img>` will show the broken-image icon and you'll see a console
error. The worker does *not* retry or substitute a placeholder. If you want
fallback handling, do it in the frontend (the `BidifyV2` NFT contract emits
metadata that includes a `fallback_image` you can render on error).

**Q: My image is 5MB. Will this blow up the free tier?**
A: Storage on R2 is paid, not free. The free Images tier is for
*transformations*, not storage. The worker stores originals in R2 (which has
its own pricing: $0.015/GB/month, no egress fees). For 1,000 NFTs averaging
2MB each, that's 2GB = $0.03/month. Negligible.
