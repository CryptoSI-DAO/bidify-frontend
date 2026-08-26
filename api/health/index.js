// GET /api/health — per-chain RPC probe
import { getListingState, CHAINS } from "../_lib/indexer.js";

export default async function handler(req, res) {
  const probes = {};
  await Promise.all(
    Object.keys(CHAINS).map(async (cid) => {
      try {
        await getListingState(cid, 0).catch(() => null);
        probes[CHAINS[cid].name] = "ok";
      } catch {
        probes[CHAINS[cid].name] = "error";
      }
    })
  );
  return {
    statusCode: 200,
    headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
    body: JSON.stringify({ ok: true, chains: probes, ts: Date.now() }),
  };
}
