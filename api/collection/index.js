// GET /api/collection?chainId=&owner=       → owner's active listings
// GET /api/collection/[platform]/[id]       → single NFT metadata
// legacy PUT/POST admincollection → no-op
import { getAuctionsForChain, fetchNftMetadata, CHAINS } from "../../_lib/indexer.js";

export const config = { maxDuration: 60 };

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,PUT,DELETE,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  const method = (req.method || "GET").toUpperCase();
  if (method === "OPTIONS") {
    res.statusCode = 204;
    return res.end();
  }

  const url = new URL(req.url, "https://bidify.local");
  const q = url.searchParams;
  const segs = url.pathname.replace(/\/+$/, "").split("/").filter(Boolean);
  const platform = segs.length > 2 ? segs[2] : null;
  const tokenId = segs.length > 3 ? segs[3] : null;

  try {
    if (!platform && method === "GET") {
      const chainId = Number(q.get("chainId") || 8453);
      const owner = q.get("owner");
      if (!CHAINS[chainId]) {
        res.statusCode = 400;
        return res.end(JSON.stringify({ error: "unsupported chain" }));
      }
      if (!owner) {
        res.statusCode = 200;
        return res.end("[]");
      }
      const all = await getAuctionsForChain(chainId);
      const mine = all.filter((a) => String(a.owner).toLowerCase() === owner.toLowerCase());
      res.statusCode = 200;
      return res.end(JSON.stringify(mine));
    }

    if (platform && tokenId && method === "GET") {
      const chainId = Number(q.get("chainId") || 8453);
      if (!CHAINS[chainId]) {
        res.statusCode = 400;
        return res.end(JSON.stringify({ error: "unsupported chain" }));
      }
      const meta = await fetchNftMetadata(chainId, platform, tokenId, true).catch(() => null);
      res.statusCode = 200;
      return res.end(
        JSON.stringify({
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
        })
      );
    }

    if (method === "PUT" || method === "POST") {
      res.statusCode = method === "POST" ? 201 : 200;
      return res.end(JSON.stringify({ ok: true }));
    }
    res.statusCode = 404;
    return res.end(JSON.stringify({ error: "not found" }));
  } catch (e) {
    res.statusCode = 500;
    return res.end(JSON.stringify({ error: String((e && e.message) || e) }));
  }
}
