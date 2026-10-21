import { database, mongo } from "./db";
import { discover } from "./sources";
import { nextDiscoveryRun } from "./scheduling";
import { randomUUID } from "node:crypto";
/** A lease prevents multiple worker replicas from running the same source together. */
export async function runScheduledDiscovery(now = new Date(), run = discover) {
  await mongo.connect();
  const sources = database.collection("sources");
  const due = await sources
    .find({ enabled: true, nextRunAt: { $lte: now } })
    .toArray();
  let runs = 0;
  for (const source of due) {
    const lease = randomUUID();
    const claimed = await sources.findOneAndUpdate(
      {
        id: source.id,
        enabled: true,
        nextRunAt: { $lte: now },
        $or: [
          { discoveryLockedUntil: { $exists: false } },
          { discoveryLockedUntil: null },
          { discoveryLockedUntil: { $lte: now } },
        ],
      },
      {
        $set: {
          discoveryLease: lease,
          discoveryLockedUntil: new Date(now.getTime() + 15 * 60000),
        },
      },
      { returnDocument: "after" },
    );
    if (!claimed) continue;
    try {
      await run(claimed.id, claimed.query);
      await sources.updateOne(
        { id: claimed.id, discoveryLease: lease },
        {
          $set: {
            nextRunAt: nextDiscoveryRun(claimed as any, new Date()),
            lastError: null,
          },
          $unset: { discoveryLease: "", discoveryLockedUntil: "" },
        },
      );
    } catch (e) {
      await sources.updateOne(
        { id: claimed.id, discoveryLease: lease },
        {
          $set: {
            lastError: e instanceof Error ? e.message : "Discovery failed",
            lastRunAt: new Date(),
            nextRunAt: new Date(Date.now() + 6 * 3600000),
          },
          $unset: { discoveryLease: "", discoveryLockedUntil: "" },
        },
      );
    }
    runs++;
  }
  return runs;
}
