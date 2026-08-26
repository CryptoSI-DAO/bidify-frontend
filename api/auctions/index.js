// GET /api/auctions         → active auctions for ?chainId=
// GET /api/auctions/[id]    → single auction ?network=
// legacy POST/PUT cache writes → no-ops
import { getAuctionsForChain, getAuctionById, CHAINS } from "../_lib/indexer.js";

export const config = { maxDuration: 60 };

const cors = (res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,PUT,DELETE,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
};

export default async function handler(req, res) {
  cors(res);
  const method = (req.method || "GET").toUpperCase();
  if (method === "OPTIONS") {
    res.statusCode = 204;
    return res.end();
  }

  const url = new URL(req.url, "https://bidify.local");
  const segs = url.pathname.replace(/\/+$/, "").split("/").filter(Boolean);
  const id = segs.length > 2 ? segs[2] : null;

  try {
    if (!id && method === "GET") {
      const chainId = Number(url.searchParams.get("chainId") || url.searchParams.get("network") || 8453);
      if (!CHAINS[chainId]) {
        res.statusCode = 400;
        return res.end(JSON.stringify({ error: "unsupported chain" }));
      }
      const auctions = await getAuctionsForChain(chainId);
      res.statusCode = 200;
      return res.end(JSON.stringify(auctions));
    }
    if (id && method === "GET") {
      if (id === "count") {
        res.statusCode = 200;
        return res.end("[]");
      }
      const network = Number(url.searchParams.get("network") || url.searchParams.get("chainId") || 8453);
      if (!CHAINS[network]) {
        res.statusCode = 400;
        return res.end(JSON.stringify({ error: "unsupported chain" }));
      }
      const a = await getAuctionById(network, id);
      res.statusCode = 200;
      return res.end(JSON.stringify(a));
    }
    if (!id && method === "POST") {
      res.statusCode = 201;
      return res.end(JSON.stringify({ ok: true }));
    }
    if (id && (method === "PUT" || method === "DELETE")) {
      res.statusCode = 200;
      return res.end(JSON.stringify({ ok: true }));
    }
    res.statusCode = 404;
    return res.end(JSON.stringify({ error: "not found" }));
  } catch (e) {
    res.statusCode = 500;
    return res.end(JSON.stringify({ error: String((e && e.message) || e) }));
  }
}
