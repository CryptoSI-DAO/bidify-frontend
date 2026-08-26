// GET /api/health — static config echo (RPC probing lives in /api/auctions)
export const config = { maxDuration: 10 };

export default async function handler(req, res) {
  return {
    statusCode: 200,
    headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
    body: JSON.stringify({
      ok: true,
      service: "bidify-v2-frontend",
      chains: ["ethereum", "bnb", "arbitrum", "base", "robinhood"],
      ts: Date.now(),
    }),
  };
}
