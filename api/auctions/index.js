// GET /api/auctions         → active auctions for ?chainId=
// GET /api/auctions/[id]    → single auction ?network=

export const config = { maxDuration: 60 };

import { getAuctionsForChain, getAuctionById, CHAINS } from "../_lib/indexer.js";

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
  const segs = url.pathname.replace(/\/+$/, "").split("/").filter(Boolean);
  // ["api","auctions"] or ["api","auctions","<id>"]
  const id = segs.length > 2 ? segs[2] : null;

  try {
    if (!id && method === "GET") {
      const chainId = Number(url.searchParams.get("chainId") || url.searchParams.get("network") || 8453);
      if (!CHAINS[chainId]) return json({ error: "unsupported chain" }, 400);
      return json(await getAuctionsForChain(chainId));
    }
    if (id && method === "GET") {
      if (id === "count") return json([]);
      const network = Number(url.searchParams.get("network") || url.searchParams.get("chainId") || 8453);
      if (!CHAINS[network]) return json({ error: "unsupported chain" }, 400);
      return json(await getAuctionById(network, id));
    }
    // legacy cache writes → no-ops
    if (!id && method === "POST") return json({ ok: true }, 201);
    if (id && (method === "PUT" || method === "DELETE")) return json({ ok: true });
    return json({ error: "not found" }, 404);
  } catch (e) {
    return json({ error: String((e && e.message) || e) }, 500);
  }
}
