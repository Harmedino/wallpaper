import { expandBackground } from "./outpaint";
import sharp from "sharp";
import { resolutionAssessment } from "./quality";
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
      const sourceMeta = await sharp(bytes).metadata();
      const assessment = resolutionAssessment(
        { width: sourceMeta.width!, height: sourceMeta.height! },
        options,
      );
      let status = assessment.native
        ? "native-resolution · fitted to target"
        : "resized · standard interpolation";
      if (options.ai && assessment.needsUpscale) {
        await db.job.update({
          where: { id: job.id },
          data: { progress: 25, stage: "AI super-resolution" },
        });
        try {
          const enhanced = await upscale(bytes, assessment.scale);
          const em = await sharp(enhanced.bytes).metadata();
          if (
            !em.width ||
            !em.height ||
            em.width <= sourceMeta.width! ||
            em.height <= sourceMeta.height!
          )
            throw new Error(
              "AI provider did not return a higher-resolution image",
            );
          if (sourceMeta.hasAlpha) {
            const alpha = await sharp(bytes)
              .extractChannel("alpha")
              .resize(em.width, em.height)
              .toColourspace("b-w")
              .raw()
              .toBuffer();
            bytes = await sharp(enhanced.bytes)
              .removeAlpha()
              .joinChannel(alpha, {
                raw: { width: em.width!, height: em.height!, channels: 1 },
              })
              .png()
              .toBuffer();
          } else bytes = enhanced.bytes;
          status = enhanced.status;
        } catch (error) {
          await db.job.update({
            where: { id: job.id },
            data: {
              status: "failed",
              error: `AI enhancement failed: ${error instanceof Error ? error.message : "Provider unavailable"}. Standard resizing was not substituted.`,
              lockedAt: null,
              progress: 25,
            },
          });
          continue;
        }
      }
      if (options.outpaint) {
        await db.job.update({
          where: { id: job.id },
          data: { progress: 60, stage: "AI background expansion" },
        });
        try {
          bytes = await expandBackground(bytes, options);
          status += " · AI-expanded background";
        } catch (error) {
          await db.job.update({
            where: { id: job.id },
            data: {
              status: "failed",
              error:
                error instanceof Error
                  ? error.message
                  : "Background expansion failed",
              lockedAt: null,
            },
          });
          continue;
        }
      }
      await db.job.update({ where: { id: job.id }, data: { progress: 75 } });
      const result = await render(
        bytes,
        options.outpaint
          ? {
              ...options,
              rotation: 0,
              flip: false,
              flop: false,
              backgroundMode: "crop",
              zoom: 1,
              smartCrop: false,
            }
          : options,
        undefined,
        await studioPhotos(
          [
            ...options.photoIds,
            ...(options.backgroundPhotoId ? [options.backgroundPhotoId] : []),
          ],
          upload.ownerId,
        ),
      );
      const verified = await sharp(result).metadata();
      if (
        verified.width !== options.width ||
        verified.height !== options.height ||
        !verified.format
      )
        throw new Error(
          "Export verification failed: incorrect dimensions or encoding",
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
          verifiedWidth: verified.width,
          verifiedHeight: verified.height,
          verifiedFormat: verified.format,
          bytes: result.length,
          verifiedAt: new Date(),
          assessment,
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
