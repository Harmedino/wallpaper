import { studioPhotos } from "./studio-photos";
import { db, database, mongo } from "./db";
import { get, put } from "./storage";
import { render, optionsSchema } from "./images";
import { upscale } from "./ai";
export async function processNextJob(jobId?: string) {
  await mongo.connect();
  const claimed = await database.collection("jobs").findOneAndUpdate(
    {
      ...(jobId ? { id: jobId } : {}),
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
      const result = await render(
        bytes,
        options,
        undefined,
        await studioPhotos(options.photoIds, upload.ownerId),
      );
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
