import { GridFSBucket } from "mongodb";
import { database, mongo } from "./db";
import { mkdir, readFile, writeFile, unlink, readdir } from "node:fs/promises";
import path from "node:path";
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  ListObjectsV2Command,
} from "@aws-sdk/client-s3";
const root = path.resolve(
  /* turbopackIgnore: true */ process.env.STORAGE_DIR || ".data/media",
);
export function storageProvider() {
  const configured = process.env.STORAGE_PROVIDER || "local";
  return process.env.VERCEL && configured === "local" ? "mongodb" : configured;
}
const remote = () => storageProvider() === "r2";
const grid = () => storageProvider() === "mongodb";
async function bucket() {
  await mongo.connect();
  return new GridFSBucket(database, { bucketName: "media" });
}

function client() {
  return new S3Client({
    region: "auto",
    endpoint: process.env.R2_ENDPOINT,
    credentials: {
      accessKeyId: process.env.R2_ACCESS_KEY_ID!,
      secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
    },
  });
}
function safe(key: string) {
  if (
    !/^[a-zA-Z0-9/_\.\-]+$/.test(key) ||
    key.includes("..") ||
    key.startsWith("/")
  )
    throw new Error("Invalid storage key");
  return path.join(/* turbopackIgnore: true */ root, key);
}
export async function put(key: string, body: Buffer, type = "image/webp") {
  safe(key);
  if (grid()) {
    const store = await bucket();
    const previous = await store.find({ filename: key }).toArray();
    const upload = store.openUploadStream(key, {
      metadata: { contentType: type },
    });
    await new Promise<void>((resolve, reject) => {
      upload.on("error", reject);
      upload.on("finish", resolve);
      upload.end(body);
    });
    for (const old of previous) await store.delete(old._id);
    return;
  }
  if (remote()) {
    await client().send(
      new PutObjectCommand({
        Bucket: process.env.R2_BUCKET,
        Key: key,
        Body: body,
        ContentType: type,
      }),
    );
  } else {
    const p = safe(key);
    await mkdir(path.dirname(p), { recursive: true });
    await writeFile(p, body);
  }
}
export async function get(key: string) {
  safe(key);
  if (grid()) {
    const store = await bucket();
    const [file] = await store
      .find({ filename: key })
      .sort({ uploadDate: -1 })
      .limit(1)
      .toArray();
    if (!file)
      throw Object.assign(new Error("Media file not found"), {
        code: "ENOENT",
      });
    const chunks: Buffer[] = [];
    for await (const chunk of store.openDownloadStream(file._id))
      chunks.push(Buffer.from(chunk));
    return Buffer.concat(chunks);
  }
  if (remote()) {
    const r = await client().send(
      new GetObjectCommand({ Bucket: process.env.R2_BUCKET, Key: key }),
    );
    return Buffer.from(await r.Body!.transformToByteArray());
  }
  return readFile(/* turbopackIgnore: true */ safe(key));
}
export async function remove(key: string) {
  safe(key);
  if (grid()) {
    const store = await bucket();
    for (const file of await store.find({ filename: key }).toArray())
      await store.delete(file._id);
    return;
  }
  if (remote())
    await client().send(
      new DeleteObjectCommand({ Bucket: process.env.R2_BUCKET, Key: key }),
    );
  else
    await unlink(safe(key)).catch((e) => {
      if (e.code !== "ENOENT") throw e;
    });
}
export async function usage() {
  if (grid()) {
    await mongo.connect();
    const [total] = await database
      .collection("media.files")
      .aggregate([
        {
          $group: {
            _id: null,
            bytes: { $sum: "$length" },
            objects: { $sum: 1 },
          },
        },
      ])
      .toArray();
    return { bytes: total?.bytes || 0, objects: total?.objects || 0 };
  }
  let bytes = 0,
    objects = 0;
  if (remote()) {
    let token: string | undefined;
    do {
      const page = await client().send(
        new ListObjectsV2Command({
          Bucket: process.env.R2_BUCKET,
          ContinuationToken: token,
        }),
      );
      for (const o of page.Contents || []) {
        bytes += o.Size || 0;
        objects++;
      }
      token = page.NextContinuationToken;
    } while (token);
  } else {
    const { stat } = await import("node:fs/promises");
    async function walk(dir: string) {
      let entries;
      try {
        entries = await readdir(dir, { withFileTypes: true });
      } catch (e) {
        if ((e as NodeJS.ErrnoException).code === "ENOENT") return;
        throw e;
      }
      for (const e of entries) {
        const p = path.join(/* turbopackIgnore: true */ dir, e.name);
        if (e.isDirectory()) await walk(p);
        else if (e.isFile()) {
          bytes += (await stat(p)).size;
          objects++;
        }
      }
    }
    await walk(root);
  }
  return { bytes, objects };
}
