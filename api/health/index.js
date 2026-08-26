// GET /api/health — liveness + per-chain RPC probe (fast: one call each, 7s cap)
import { CHAINS, rpcProbe } from "../_lib/indexer.js";

export const config = { maxDuration: 30 };

export default async function handler(req, res) {
  const probes = {};
  await Promise.all(
    Object.keys(CHAINS).map(async (cid) => {
      probes[CHAINS[cid].name] = await rpcProbe(Number(cid));
    })
  );
  return {
    statusCode: 200,
    headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
    body: JSON.stringify({ ok: true, chains: probes, ts: Date.now() }),
  };
}
