import "dotenv/config";
import { db, database, mongo } from "../src/lib/db";
import { remove } from "../src/lib/storage";
import { processNextJob } from "../src/lib/processing";
import { runScheduledDiscovery } from "../src/lib/discovery-scheduler";

let stopping = false;
process.on("SIGTERM", () => {
  stopping = true;
});
process.on("SIGINT", () => {
  stopping = true;
});
let maintenance = 0;
while (!stopping) {
  try {
    await processNextJob();
    if (Date.now() - maintenance > 60000) {
      maintenance = Date.now();
      await database
        .collection("settings")
        .updateOne(
          { key: "workerHeartbeat" },
          { $set: { at: new Date() } },
          { upsert: true },
        );
      await db.rateLimit.deleteMany({
        where: { expiresAt: { lt: new Date() } },
      });
      const expired = await db.upload.findMany({
        where: { expiresAt: { lt: new Date() } },
        take: 100,
      });
      for (const u of expired) {
        const jobs = await db.job.findMany({ where: { uploadId: u.id } });
        if (jobs.some((j) => j.status === "processing")) continue;
        await remove(u.key);
        for (const j of jobs) if (j.resultKey) await remove(j.resultKey);
        await db.job.deleteMany({ where: { uploadId: u.id } });
        await db.upload.delete({ where: { id: u.id } });
      }
      await runScheduledDiscovery();
    }
  } catch (e) {
    console.error("Worker:", e instanceof Error ? e.message : e);
  }
  await new Promise((r) => setTimeout(r, 1500));
}
await mongo.close();
