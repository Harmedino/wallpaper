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
const remote = () => process.env.STORAGE_PROVIDER === "r2";
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
