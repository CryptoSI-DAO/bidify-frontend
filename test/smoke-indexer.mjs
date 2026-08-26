// Smoke-test the indexer logic against live chains (no build needed).
// Run: NODE_PATH=server node test/smoke-indexer.mjs
import { getAuctionsForChain, getAuctionById, getListingState, CHAINS } from "../server/indexer.js";

const t0 = Date.now();
for (const cid of Object.keys(CHAINS)) {
  try {
    const st = await getListingState(cid, 0);
    const auctions = await getAuctionsForChain(cid);
    console.log(
      `${CHAINS[cid].name.padEnd(10)} listingState(0)=${st ? "struct" : "null"} auctions=${auctions.length} (${Date.now() - t0}ms)`
    );
  } catch (e) {
    console.log(`${CHAINS[cid].name.padEnd(10)} ERROR: ${e.message}`);
  }
}
// negative test: unknown chain
try {
  await getAuctionsForChain(999);
  console.log("unknown chain: FAIL (no throw)");
} catch (e) {
  console.log("unknown chain: ok (throws)");
}
