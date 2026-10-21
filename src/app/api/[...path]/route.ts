import { processNextJob } from "@/lib/processing";
import { NextResponse, after } from "next/server";
import { cookies } from "next/headers";
import { limits, limitSchema } from "@/lib/limits";
import { db, database, mongo } from "@/lib/db";
import {
  admin,
  session,
  originCheck,
  HttpError,
  rateLimit,
  checkPassword,
  sign,
} from "@/lib/auth";
import { get, put, remove, usage, storageProvider } from "@/lib/storage";
import { render, validateImage, optionsSchema } from "@/lib/images";
import { attribution, allowedLicense } from "@/lib/licenses";
import { nextDiscoveryRun } from "@/lib/scheduling";
import { discover } from "@/lib/sources";
import { remote } from "@/lib/network";
import { z } from "zod";
import sharp from "sharp";
import { randomUUID } from "node:crypto";
export const runtime = "nodejs";
export const maxDuration = 300;
function startVercelJob(id: string) {
  if (process.env.VERCEL)
    after(async () => {
      try {
        await processNextJob(id);
      } catch (e) {
        console.error(
          "Post-response processing:",
          e instanceof Error ? e.message : "Unknown error",
        );
      }
    });
}
export const dynamic = "force-dynamic";
function json(value: unknown, status = 200) {
  return NextResponse.json(value, { status });
}
function image(
  bytes: Buffer,
  type = "image/webp",
  download?: string,
  headers: Record<string, string> = {},
) {
  return new NextResponse(new Uint8Array(bytes), {
    headers: {
      "Content-Type": type,
      "Cache-Control": download ? "private, no-store" : "public, max-age=3600",
      ...(download
        ? { "Content-Disposition": `attachment; filename="${download}"` }
        : {}),
      ...headers,
    },
  });
}
async function handle(
  req: Request,
  ctx: { params: Promise<{ path: string[] }> },
) {
  try {
    const { path } = await ctx.params;
    const [area, id, action] = path;
    const url = new URL(req.url);
    const mutation = req.method !== "GET";
    if (mutation) originCheck(req);
    await mongo.connect();
    if (mutation && area !== "uploads" && req.body) {
      const reader = req.body.getReader();
      const chunks: Uint8Array[] = [];
      let size = 0;
      while (true) {
        const part = await reader.read();
        if (part.done) break;
        size += part.value.length;
        if (size > 16384) {
          await reader.cancel();
          throw new HttpError(413, "Request body too large");
        }
        chunks.push(part.value);
      }
      req = new Request(req.url, {
        method: req.method,
        headers: req.headers,
        body: new Uint8Array(Buffer.concat(chunks.map((c) => Buffer.from(c)))),
      });
    }
    if (area === "capabilities" && req.method === "GET")
      return json({
        limits: await limits(),
        aiProvider: process.env.AI_PROVIDER || "none",
      });
    if (area === "health") {
      await database.command({ ping: 1 });
      return json({
        ok: true,
        database: "MongoDB",
        ai: process.env.AI_PROVIDER || "none",
      });
    }
    if (area === "session") {
      if (req.method === "DELETE") {
        (await cookies()).delete("wallpaper-session");
        return json({ ok: true });
      }
      return json(await session(true));
    }
    if (area === "login" && req.method === "POST") {
      await rateLimit("login:global", 30, 900);
      const { password } = z
        .object({ password: z.string().max(200) })
        .parse(await req.json());
      if (!checkPassword(password))
        throw new HttpError(401, "Incorrect password");
      const user = await db.user.create({ data: { role: "admin" } });
      (await cookies()).set("wallpaper-session", sign(user.id, "admin"), {
        httpOnly: true,
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
        path: "/",
        maxAge: 604800,
      });
      return json({ ok: true });
    }
    if (area === "wallpapers") {
      if (!id) {
        const q = (url.searchParams.get("q") || "").slice(0, 100),
          category = url.searchParams.get("category"),
          color = url.searchParams.get("color"),
          orientation = url.searchParams.get("orientation"),
          resolution = url.searchParams.get("resolution"),
          sort = url.searchParams.get("sort");
        const page = Math.max(
          1,
          Math.min(1000, Number(url.searchParams.get("page")) || 1),
        );
        const where: any = { published: true };
        if (q) where.$text = { $search: q };
        if (category) where.category = category;
        if (color) where.color = color;
        if (resolution === "4k") where.width = { $gte: 3840 };
        if (url.searchParams.get("featured")) where.featured = true;
        if (orientation)
          where.$expr =
            orientation === "portrait"
              ? { $gt: ["$height", "$width"] }
              : { $gte: ["$width", "$height"] };
        const [result] = await database
          .collection("wallpapers")
          .aggregate([
            { $match: where },
            {
              $sort:
                sort === "popular"
                  ? { downloads: -1, createdAt: -1 }
                  : { createdAt: -1 },
            },
            {
              $facet: {
                items: [
                  { $skip: (page - 1) * 18 },
                  { $limit: 18 },
                  {
                    $project: { _id: 0, originalKey: 0, thumbKey: 0, hash: 0 },
                  },
                ],
                total: [{ $count: "count" }],
              },
            },
          ])
          .toArray();
        const total = result?.total?.[0]?.count || 0;
        return json({
          items: result?.items || [],
          total,
          page,
          pages: Math.ceil(total / 18),
        });
      }
      const w = await db.wallpaper.findUnique({ where: { id } });
      if (!w || (!w.published && (await session())?.role !== "admin"))
        throw new HttpError(404, "Wallpaper not found");
      if (action === "thumbnail") return image(await get(w.thumbKey));
      if (action === "attribution")
        return new NextResponse(attribution(w as any), {
          headers: {
            "Content-Type": "text/plain; charset=utf-8",
            "Content-Disposition": 'attachment; filename="attribution.txt"',
          },
        });
      if (action === "download") {
        const owner = await session(true);
        await rateLimit(`download:${owner!.id}`, 60);
        await rateLimit("downloads:global", 1000);
        const options = optionsSchema.parse({
          width: Number(url.searchParams.get("width") || 3840),
          height: Number(url.searchParams.get("height") || 2160),
          format: url.searchParams.get("format") || "jpg",
        });
        let variant = await db.variant.findUnique({
          where: {
            wallpaperId: id,
            width: options.width,
            height: options.height,
            format: options.format,
          },
        });
        let bytes: Buffer;
        if (variant) bytes = await get(variant.key);
        else {
          bytes = await render(await get(w.originalKey), options);
          const key = `variants/${id}/${options.width}x${options.height}.${options.format}`;
          await put(
            key,
            bytes,
            `image/${options.format === "jpg" ? "jpeg" : options.format}`,
          );
          try {
            await db.variant.create({
              data: {
                wallpaperId: id,
                width: options.width,
                height: options.height,
                format: options.format,
                key,
              },
            });
          } catch {}
        }
        await db.wallpaper.update({
          where: { id },
          data: { downloads: { increment: 1 } },
        });
        await db.download.create({
          data: {
            wallpaperId: id,
            width: options.width,
            height: options.height,
            format: options.format,
          },
        });
        return image(
          bytes,
          `image/${options.format === "jpg" ? "jpeg" : options.format}`,
          `wallpaper-${id}.${options.format}`,
          {
            Link: `</api/wallpapers/${id}/attribution>; rel="license"`,
            "X-Wallpaper-License": w.license,
          },
        );
      }
      const { originalKey, thumbKey, hash, ...publicWallpaper } = w;
      return json(publicWallpaper);
    }
    if (area === "uploads") {
      const u = await session(true);
      if (req.method === "POST") {
        const cap = await limits();
        await rateLimit(`upload:${u!.id}`, cap.uploadsPerHour);
        await rateLimit("uploads:global", 200);
        if (Number(req.headers.get("content-length") || 0) > 21 * 1024 * 1024)
          throw new HttpError(413, "Maximum upload is 20 MB");
        const chunks: Uint8Array[] = [];
        let size = 0;
        const reader = req.body?.getReader();
        if (!reader) throw new HttpError(400, "Missing upload");
        while (true) {
          const part = await reader.read();
          if (part.done) break;
          size += part.value.length;
          if (size > 21 * 1024 * 1024) {
            await reader.cancel();
            throw new HttpError(413, "Maximum upload is 20 MB");
          }
          chunks.push(part.value);
        }
        const payload = Buffer.concat(chunks.map((c) => Buffer.from(c)));
        const form = await new Response(payload, {
          headers: { "Content-Type": req.headers.get("content-type") || "" },
        }).formData();
        if (form.get("rights") !== "true")
          throw new HttpError(400, "Confirm your rights to upload this image");
        const file = form.get("file");
        if (!(file instanceof File) || file.size > cap.uploadMb * 1024 * 1024)
          throw new HttpError(400, "Upload a JPG, PNG or WebP under 20 MB");
        const clean = await validateImage(
          Buffer.from(await file.arrayBuffer()),
        );
        const key = `private/${u!.id}/${randomUUID()}.webp`;
        await put(key, clean.bytes);
        const row = await db.upload.create({
          data: {
            ownerId: u!.id,
            key,
            width: clean.width,
            height: clean.height,
            hash: clean.hash,
            expiresAt: new Date(Date.now() + cap.retentionHours * 3600000),
          },
        });
        return json({ id: row.id, width: row.width, height: row.height }, 201);
      }
      if (!id) {
        const rows = await db.upload.findMany({
          where: { ownerId: u!.id, expiresAt: { gt: new Date() } },
          orderBy: { createdAt: "desc" },
        });
        const uploads = await Promise.all(
          rows.map(async (r) => ({
            id: r.id,
            width: r.width,
            height: r.height,
            expiresAt: r.expiresAt,
            jobs: await db.job.findMany({
              where: { uploadId: r.id },
              orderBy: { createdAt: "desc" },
            }),
          })),
        );
        return json(uploads);
      }
      const upload = await db.upload.findUnique({
        where: { id, ownerId: u!.id, expiresAt: { gt: new Date() } },
      });
      if (!upload) throw new HttpError(404, "Upload not found");
      if (req.method === "DELETE") {
        const jobs = await db.job.findMany({ where: { uploadId: id } });
        if (jobs.some((j) => j.status === "processing"))
          throw new HttpError(
            409,
            "Wait for processing to finish before deleting",
          );
        await remove(upload.key);
        for (const j of jobs) if (j.resultKey) await remove(j.resultKey);
        await db.job.deleteMany({ where: { uploadId: id } });
        await db.upload.delete({ where: { id } });
        return json({ ok: true });
      }
      if (action === "image")
        return image(await get(upload.key), "image/webp", undefined, {
          "Cache-Control": "private, no-store",
        });
    }
    if (area === "jobs") {
      const u = await session(true);
      if (req.method === "POST") {
        const cap = await limits();
        await rateLimit(`job:${u!.id}`, cap.jobsPerHour);
        await rateLimit("jobs:global", 200);
        const input = await req.json();
        const upload = await db.upload.findUnique({
          where: {
            id: String(input.uploadId),
            ownerId: u!.id,
            expiresAt: { gt: new Date() },
          },
        });
        if (!upload) throw new HttpError(404, "Upload not found");
        const options = optionsSchema.parse(input.options);
        if (options.width * options.height > cap.outputMegapixels * 1000000)
          throw new HttpError(400, "Output exceeds administrator pixel limit");
        const job = await db.job.create({
          data: {
            uploadId: upload.id,
            ownerId: u!.id,
            status: "queued",
            progress: 0,
            attempts: 0,
            availableAt: new Date(),
            options,
          },
        });
        startVercelJob(job.id);
        return json({ id: job.id }, 201);
      }
      const job = await db.job.findUnique({ where: { id, ownerId: u!.id } });
      if (!job) throw new HttpError(404, "Job not found");
      const upload = await db.upload.findUnique({
        where: { id: job.uploadId, expiresAt: { gt: new Date() } },
      });
      if (!upload) throw new HttpError(410, "Upload expired");
      if (action === "result") {
        if (job.status !== "completed")
          throw new HttpError(409, "Image is not ready");
        const format = job.options.format;
        return image(
          await get(job.resultKey),
          `image/${format === "jpg" ? "jpeg" : format}`,
          url.searchParams.has("download")
            ? `wallpaper-${job.id}.${format}`
            : undefined,
          { "Cache-Control": "private, no-store" },
        );
      }
      if (
        (job.status === "queued" && job.availableAt <= new Date()) ||
        (job.status === "processing" &&
          job.lockedAt < new Date(Date.now() - 15 * 60000))
      )
        startVercelJob(job.id);
      const { resultKey, ...publicJob } = job;
      return json(publicJob);
    }
    if (area === "reports" && req.method === "POST") {
      await rateLimit("reports:global", 30);
      const input = z
        .object({
          email: z.email().max(200),
          url: z.url().max(1000),
          reason: z.string().min(20).max(4000),
        })
        .parse(await req.json());
      await db.report.create({ data: input });
      return json({ ok: true }, 201);
    }
    if (area === "admin") {
      const u = await admin();
      if (!id) {
        const wallpapers = await db.wallpaper.findMany({
          take: 1000,
          orderBy: { downloads: "desc" },
        });
        return json({
          wallpapers,
          downloads: wallpapers.reduce((s, w) => s + w.downloads, 0),
          candidates: await db.candidate.findMany({
            where: { status: "pending" },
            take: 100,
          }),
          jobs: await db.job.findMany({
            orderBy: { createdAt: "desc" },
            take: 50,
          }),
          sources: await db.source.findMany(),
          reports: await db.report.findMany({ take: 100 }),
          uploads: await db.upload.count(),
          aiProvider: process.env.AI_PROVIDER || "none",
          limits: await limits(),
          storageUsage: await usage().catch(() => null),
          workerHeartbeat: await database
            .collection("settings")
            .findOne({ key: "workerHeartbeat" }, { projection: { _id: 0 } }),
          storage: storageProvider(),
        });
      }
      if (id === "limits" && req.method === "POST") {
        const value = limitSchema.parse(await req.json());
        await database
          .collection("settings")
          .updateOne({ key: "limits" }, { $set: { value } }, { upsert: true });
        return json({ ok: true });
      }
      if (id === "enhance" && req.method === "POST") {
        const { wallpaperId } = z
          .object({ wallpaperId: z.string() })
          .parse(await req.json());
        const w = await db.wallpaper.findUniqueOrThrow({
          where: { id: wallpaperId },
        });
        await rateLimit("admin-enhance", 20);
        const key = `private/${u.id}/${randomUUID()}.webp`;
        await put(key, await get(w.originalKey));
        const upload = await db.upload.create({
          data: {
            ownerId: u.id,
            key,
            width: w.width,
            height: w.height,
            hash: w.hash,
            expiresAt: new Date(Date.now() + 86400000),
          },
        });
        const job = await db.job.create({
          data: {
            uploadId: upload.id,
            ownerId: u.id,
            wallpaperId,
            status: "queued",
            progress: 0,
            attempts: 0,
            availableAt: new Date(),
            options: optionsSchema.parse({
              width: 3840,
              height: 2160,
              format: "webp",
              ai: true,
              sharpen: true,
            }),
          },
        });
        startVercelJob(job.id);
        return json({ id: job.id });
      }
      if (id === "apply-result" && req.method === "POST") {
        const { jobId } = z
          .object({ jobId: z.string() })
          .parse(await req.json());
        const job = await db.job.findUniqueOrThrow({
          where: { id: jobId, status: "completed", ownerId: u.id },
        });
        if (!job.wallpaperId)
          throw new HttpError(400, "Not an administrator enhancement job");
        const clean = await validateImage(await get(job.resultKey));
        const key = `originals/${clean.hash}.webp`,
          thumb = `thumbs/${clean.hash}.webp`;
        await put(key, clean.bytes);
        await put(
          thumb,
          await sharp(clean.bytes)
            .resize(1200, 900, { fit: "inside" })
            .webp()
            .toBuffer(),
        );
        await db.wallpaper.update({
          where: { id: job.wallpaperId },
          data: {
            originalKey: key,
            thumbKey: thumb,
            hash: clean.hash,
            width: clean.width,
            height: clean.height,
            aiStatus: job.aiStatus,
          },
        });
        const variants = await db.variant.findMany({
          where: { wallpaperId: job.wallpaperId },
        });
        for (const v of variants) await remove(v.key);
        await db.variant.deleteMany({
          where: { wallpaperId: job.wallpaperId },
        });
        return json({ ok: true });
      }
      if (id === "regenerate" && req.method === "POST") {
        const { wallpaperId } = z
          .object({ wallpaperId: z.string() })
          .parse(await req.json());
        await rateLimit("admin-regenerate", 10);
        const w = await db.wallpaper.findUniqueOrThrow({
          where: { id: wallpaperId },
        });
        const bytes = await get(w.originalKey);
        for (const [width, height] of [
          [1920, 1080],
          [3840, 2160],
          [1080, 1920],
        ]) {
          const key = `variants/${wallpaperId}/${width}x${height}.jpg`;
          await put(
            key,
            await render(bytes, { width, height, format: "jpg" }),
            "image/jpeg",
          );
          await db.variant.upsert({
            where: { wallpaperId, width, height, format: "jpg" },
            create: { wallpaperId, width, height, format: "jpg", key },
            update: { key },
          });
        }
        return json({ ok: true });
      }
      if (id === "sources" && req.method === "POST") {
        const input = z
          .object({
            id: z.enum(["openverse", "commons", "nasa"]),
            query: z.string().min(1).max(100),
            enabled: z.boolean(),
            schedule: z.enum(["weekly", "interval"]).default("weekly"),
            intervalHours: z.number().int().min(6).max(720).default(168),
          })
          .parse(await req.json());
        await db.source.upsert({
          where: { id: input.id },
          create: { ...input, nextRunAt: nextDiscoveryRun(input) },
          update: { ...input, nextRunAt: nextDiscoveryRun(input) },
        });
        return json({ ok: true });
      }
      if (id === "discover" && req.method === "POST") {
        const input = z
          .object({
            id: z.enum(["openverse", "commons", "nasa"]),
            query: z.string().min(1).max(100),
          })
          .parse(await req.json());
        await rateLimit("discovery", 6);
        return json({ added: await discover(input.id, input.query) });
      }
      if (id === "review" && req.method === "POST") {
        const input = z
          .object({
            id: z.string(),
            decision: z.enum(["approve", "reject"]),
            note: z.string().min(10).max(2000),
            rightsConfirmed: z.boolean(),
            category: z.string().min(1).max(100),
          })
          .parse(await req.json());
        const c = await db.candidate.findUniqueOrThrow({
          where: { id: input.id, status: "pending" },
        });
        if (input.decision === "approve") {
          if (!input.rightsConfirmed || !allowedLicense(c.license))
            throw new HttpError(
              400,
              "Verify rights, attribution, license and any personality/trademark restrictions first",
            );
          const clean = await validateImage(await remote(c.imageUrl));
          if (await db.wallpaper.findUnique({ where: { hash: clean.hash } }))
            throw new HttpError(409, "Duplicate image");
          const key = `originals/${clean.hash}.webp`,
            thumb = `thumbs/${clean.hash}.webp`;
          await put(key, clean.bytes);
          await put(
            thumb,
            await sharp(clean.bytes)
              .resize(1200, 900, { fit: "inside" })
              .webp({ quality: 82 })
              .toBuffer(),
          );
          await db.wallpaper.create({
            data: {
              title: c.title,
              category: input.category,
              tags: input.category.toLowerCase().split(" "),
              color: "blue",
              width: clean.width,
              height: clean.height,
              originalKey: key,
              thumbKey: thumb,
              hash: clean.hash,
              creator: c.creator,
              license: c.license,
              licenseUrl: c.licenseUrl,
              sourceUrl: c.sourceUrl,
              source: c.sourceId,
              aiStatus: "original",
              published: true,
              featured: false,
              downloads: 0,
            },
          });
        }
        await db.review.create({
          data: {
            candidateId: c.id,
            reviewerId: u.id,
            decision: input.decision,
            note: input.note,
          },
        });
        await db.candidate.update({
          where: { id: c.id },
          data: {
            status: input.decision === "approve" ? "approved" : "rejected",
          },
        });
        return json({ ok: true });
      }
      if (id === "wallpapers" && req.method === "POST") {
        const input = z
          .object({
            id: z.string(),
            title: z.string().min(1).max(200),
            category: z.string().max(100),
            tags: z.array(z.string().max(40)).max(30),
            featured: z.boolean(),
            published: z.boolean(),
          })
          .parse(await req.json());
        const { id: wid, ...data } = input;
        await db.wallpaper.update({ where: { id: wid }, data });
        return json({ ok: true });
      }
      if (id === "publish-upload" && req.method === "POST") {
        const input = z
          .object({
            uploadId: z.string(),
            title: z.string().min(1).max(200),
            category: z.string().max(100),
            creator: z.string().min(1).max(200),
            license: z.string(),
            sourceUrl: z
              .url()
              .refine(
                (v) => v.startsWith("https://"),
                "Use an HTTPS source URL",
              ),
            licenseUrl: z
              .url()
              .refine(
                (v) => v.startsWith("https://"),
                "Use an HTTPS license URL",
              ),
            rightsConfirmed: z.literal(true),
          })
          .parse(await req.json());
        if (!allowedLicense(input.license))
          throw new HttpError(400, "Unsupported redistribution license");
        const upload = await db.upload.findUniqueOrThrow({
          where: {
            id: input.uploadId,
            ownerId: u.id,
            expiresAt: { gt: new Date() },
          },
        });
        if (await db.wallpaper.findUnique({ where: { hash: upload.hash } }))
          throw new HttpError(409, "Duplicate image");
        const bytes = await get(upload.key),
          key = `originals/${upload.hash}.webp`,
          thumb = `thumbs/${upload.hash}.webp`;
        await put(key, bytes);
        await put(
          thumb,
          await sharp(bytes)
            .resize(1200, 900, { fit: "inside" })
            .webp()
            .toBuffer(),
        );
        await db.wallpaper.create({
          data: {
            title: input.title,
            category: input.category,
            tags: [],
            color: "blue",
            width: upload.width,
            height: upload.height,
            hash: upload.hash,
            originalKey: key,
            thumbKey: thumb,
            creator: input.creator,
            license: input.license,
            licenseUrl: input.licenseUrl,
            sourceUrl: input.sourceUrl,
            source: "admin",
            aiStatus: "original",
            published: true,
            featured: false,
            downloads: 0,
          },
        });
        return json({ ok: true });
      }
    }
    throw new HttpError(404, "Endpoint not found");
  } catch (e) {
    if (
      e instanceof Error &&
      /^Mongo(?:ServerSelection|Network|NetworkTimeout|TopologyClosed|NotConnected|OperationTimeout)Error$/.test(
        e.name,
      )
    )
      return json(
        {
          error:
            "The collection is temporarily unavailable. Please try again shortly.",
        },
        503,
      );
    if (e instanceof HttpError) return json({ error: e.message }, e.status);
    if (e instanceof z.ZodError)
      return json({ error: e.issues.map((x) => x.message).join("; ") }, 400);
    console.error(e instanceof Error ? e.message : e);
    return json(
      {
        error:
          e instanceof Error &&
          /image|pixel|hostname|large|format|rights|Duplicate/i.test(e.message)
            ? e.message
            : "The operation failed. Check server logs and service configuration.",
      },
      500,
    );
  }
}
export const GET = handle;
export const POST = handle;
export const DELETE = handle;
