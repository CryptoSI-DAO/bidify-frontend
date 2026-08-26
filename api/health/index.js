// GET /api/health — static config echo (canonical res-based handler)
export const config = { maxDuration: 10 };

export default async function handler(req, res) {
  res.statusCode = 200;
  res.setHeader("Content-Type", "application/json");
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.end(
    JSON.stringify({
      ok: true,
      service: "bidify-v2-frontend",
      chains: ["ethereum", "bnb", "arbitrum", "base", "robinhood"],
      ts: Date.now(),
    })
  );
}
