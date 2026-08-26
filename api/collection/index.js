// GET /api/collection?chainId=&owner=       → owner's active listings (chain-derived)
// GET /api/collection/[platform]/[id]       → single NFT metadata
// legacy PUT/POST admincollection → no-op

export const config = { maxDuration: 60 };

import { getAuctionsForChain, fetchNftMetadata, CHAINS } from "../../_lib/indexer.js";

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

export default async function handler(req, res) {
  const method = (req.method || "GET").toUpperCase();
  if (method === "OPTIONS") return { statusCode: 204, headers: CORS };

  const url = new URL(req.url, "https://bidify.local");
  const q = url.searchParams;
  const segs = url.pathname.replace(/\/+$/, "").split("/").filter(Boolean);
  // ["api","collection"] | ["api","collection",platform,id]
  const platform = segs.length > 2 ? segs[2] : null;
  const tokenId = segs.length > 3 ? segs[3] : null;

  try {
    if (!platform && method === "GET") {
      const chainId = Number(q.get("chainId") || 8453);
      const owner = q.get("owner");
      if (!CHAINS[chainId]) return json({ error: "unsupported chain" }, 400);
      if (!owner) return json([]);
      const all = await getAuctionsForChain(chainId);
      return json(all.filter((a) => String(a.owner).toLowerCase() === owner.toLowerCase()));
    }

    if (platform && tokenId && method === "GET") {
      const chainId = Number(q.get("chainId") || 8453);
      if (!CHAINS[chainId]) return json({ error: "unsupported chain" }, 400);
      const meta = await fetchNftMetadata(chainId, platform, tokenId, true).catch(() => null);
      return json({
        id: tokenId,
        platform,
        network: chainId,
        name: (meta && meta.name) || `#${tokenId}`,
        description: (meta && meta.description) || "",
        image: (meta && meta.image) || null,
        animation_url: (meta && meta.animation_url) || null,
        owner: q.get("owner") || null,
        isERC721: true,
        price: null,
        endingPrice: null,
      });
    }

    // legacy writes (admincollection) → no-op
    if (method === "PUT" || method === "POST") return json({ ok: true }, method === "POST" ? 201 : 200);
    return json({ error: "not found" }, 404);
  } catch (e) {
    return json({ error: String((e && e.message) || e) }, 500);
  }
}
