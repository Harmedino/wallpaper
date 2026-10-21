import "dotenv/config";
import { db, database, mongo } from "../src/lib/db";
import { get, put, remove } from "../src/lib/storage";
import { render, optionsSchema } from "../src/lib/images";
import { upscale } from "../src/lib/ai";
import { discover } from "../src/lib/sources";

let stopping = false;
process.on("SIGTERM", () => {
  stopping = true;
});
process.on("SIGINT", () => {
  stopping = true;
});
let maintenance = 0;
export async function tick() {
  const claimed = await database.collection("jobs").findOneAndUpdate(
    {
      $or: [
        { status: "queued", availableAt: { $lte: new Date() } },
        {
          status: "processing",
          lockedAt: { $lt: new Date(Date.now() - 15 * 60000) },
        },
      ],
    },
    {
      $set: { status: "processing", lockedAt: new Date(), progress: 5 },
      $inc: { attempts: 1 },
    },
    { sort: { createdAt: 1 }, returnDocument: "after" },
  );
  const jobs = claimed ? [claimed] : [];
  for (const job of jobs) {
    try {
      const upload = await db.upload.findUniqueOrThrow({
        where: { id: job.uploadId },
      });
      if (upload.expiresAt < new Date()) throw new Error("Upload expired");
      let bytes: Buffer = await get(upload.key);
      const options = optionsSchema.parse(job.options);
      let status = "resized";
      if (options.ai) {
        await db.job.update({ where: { id: job.id }, data: { progress: 25 } });
        try {
          const result = await upscale(bytes);
          bytes = result.bytes;
          status = result.status;
        } catch (e) {
          console.error(
            "AI provider failure:",
            e instanceof Error ? e.message : "Unknown error",
          );
          status = "resized — AI provider unavailable";
        }
      }
      await db.job.update({ where: { id: job.id }, data: { progress: 75 } });
      const result = await render(bytes, options);
      const key = `private/${upload.ownerId}/${job.id}.${options.format}`;
      await put(
        key,
        result,
        `image/${options.format === "jpg" ? "jpeg" : options.format}`,
      );
      await db.job.update({
        where: { id: job.id },
        data: {
          status: "completed",
          progress: 100,
          resultKey: key,
          aiStatus: status,
          error: null,
        },
      });
    } catch (error) {
      await db.job.update({
        where: { id: job.id },
        data: {
          status: job.attempts >= 3 ? "failed" : "queued",
          error: error instanceof Error ? error.message : "Processing failed",
          availableAt: new Date(Date.now() + job.attempts * 30000),
          lockedAt: null,
        },
      });
    }
  }
}
while (!stopping) {
  try {
    await tick();
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
      const sources = await db.source.findMany({ where: { enabled: true } });
      for (const s of sources) {
        if (
          !s.lastRunAt ||
          Date.now() - s.lastRunAt.getTime() > s.intervalHours * 3600000
        ) {
          try {
            await discover(s.id, s.query);
          } catch (e) {
            await db.source.update({
              where: { id: s.id },
              data: {
                lastRunAt: new Date(),
                lastError: e instanceof Error ? e.message : "Discovery failed",
              },
            });
          }
        }
      }
    }
  } catch (e) {
    console.error("Worker:", e instanceof Error ? e.message : e);
  }
  await new Promise((r) => setTimeout(r, 1500));
}
await mongo.close();
