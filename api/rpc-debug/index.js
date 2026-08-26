// GET /api/rpc-debug — tries every configured RPC from the function runtime
// and reports per-endpoint latency/error. Diagnostic only.
export const config = { maxDuration: 30 };

import { CHAINS } from "../_lib/indexer.js";

async function timedFetch(url) {
  const ctl = new AbortController();
  const t = setTimeout(() => ctl.abort(), 5000);
  const t0 = Date.now();
  try {
    const res = await fetch(url, {
      method: "POST",
      signal: ctl.signal,
      headers: { "Content-Type": "application/json", "User-Agent": "bidify-v2/1.0" },
      body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "eth_blockNumber", params: [] }),
    });
    const j = await res.json();
    return { ms: Date.now() - t0, status: res.status, ok: !j.error, err: j.error ? j.error.message : null };
  } catch (e) {
    return { ms: Date.now() - t0, ok: false, err: String(e.message || e).slice(0, 80) };
  } finally {
    clearTimeout(t);
  }
}

export default async function handler(req, res) {
  const out = {};
  await Promise.all(
    Object.entries(CHAINS).map(async ([cid, c]) => {
      out[c.name] = [];
      for (const url of c.rpcs) {
        out[c.name].push({ url, ...(await timedFetch(url)) });
      }
    })
  );
  return {
    statusCode: 200,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(out, null, 1),
  };
}
