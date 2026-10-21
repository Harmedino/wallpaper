import { mkdtemp, writeFile, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { remote } from "./network";
import { fetch as fetchHttp, ProxyAgent, FormData } from "undici";
import sharp from "sharp";
// A self-hosted Real-ESRGAN HTTP service accepts multipart `image` and returns image bytes.
export async function upscale(
  bytes: Buffer,
  neededScale = 4,
): Promise<{ bytes: Buffer; status: string }> {
  const provider = process.env.AI_PROVIDER || "none";
  const scale = neededScale <= 2 ? 2 : 4;
  if (provider === "none")
    throw new Error(
      "AI upscaling is not configured. Choose standard export or connect Real-ESRGAN/Replicate.",
    );
  if (provider === "local") {
    if (process.env.VERCEL)
      throw new Error(
        "Local Real-ESRGAN requires a persistent worker; use Replicate on Vercel.",
      );
    const dir = await mkdtemp(path.join(tmpdir(), "wallspace-ai-"));
    try {
      const input = path.join(dir, "input.png"),
        output = path.join(dir, "output.png");
      await writeFile(input, await sharp(bytes).png().toBuffer());
      await promisify(execFile)(
        process.env.REALESRGAN_PYTHON || "python",
        [
          path.join(process.cwd(), "scripts/realesrgan-local.py"),
          input,
          output,
          "--scale",
          String(scale),
          "--model",
          process.env.REALESRGAN_MODEL ||
            path.join(process.cwd(), ".data/models/realesr-general-x4v3.pth"),
        ],
        { timeout: 900000, maxBuffer: 1024 * 1024 },
      );
      return {
        bytes: await readFile(output),
        status: "AI-enhanced · Real-ESRGAN general x4v3 (local)",
      };
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  }
  const dispatcher = process.env.HTTPS_PROXY
    ? new ProxyAgent(process.env.HTTPS_PROXY)
    : undefined;
  if (provider === "realesrgan") {
    const endpoint = process.env.REALESRGAN_URL;
    if (!endpoint) throw new Error("REALESRGAN_URL is missing");
    const u = new URL(endpoint);
    if (
      u.protocol !== "https:" &&
      !["127.0.0.1", "localhost"].includes(u.hostname)
    )
      throw new Error("AI endpoint must use HTTPS");
    const form = new FormData();
    form.set(
      "image",
      new Blob([new Uint8Array(bytes)], { type: "image/webp" }),
      "input.webp",
    );
    const response = await fetchHttp(endpoint, {
      method: "POST",
      body: form,
      dispatcher:
        u.hostname === "127.0.0.1" || u.hostname === "localhost"
          ? undefined
          : dispatcher,
      headers: process.env.REALESRGAN_TOKEN
        ? { Authorization: `Bearer ${process.env.REALESRGAN_TOKEN}` }
        : {},
      signal: AbortSignal.timeout(300000),
    });
    if (!response.ok)
      throw new Error(`Real-ESRGAN returned ${response.status}`);
    const chunks: Buffer[] = [];
    let size = 0;
    for await (const chunk of response.body!) {
      size += chunk.length;
      if (size > 40 * 1024 * 1024) {
        await response.body?.cancel();
        throw new Error("AI result exceeds 40 MB");
      }
      chunks.push(Buffer.from(chunk));
    }
    const result = Buffer.concat(chunks);
    await sharp(result, { limitInputPixels: 40_000_000 }).metadata();
    return { bytes: result, status: "AI-enhanced · Real-ESRGAN" };
  }
  if (provider !== "replicate") throw new Error("Unsupported AI provider");
  if (!process.env.REPLICATE_API_TOKEN)
    throw new Error("REPLICATE_API_TOKEN is required");
  const headers = {
    Authorization: `Bearer ${process.env.REPLICATE_API_TOKEN}`,
    "Content-Type": "application/json",
  };
  let version = process.env.REPLICATE_MODEL_VERSION;
  if (!version) {
    const model = await fetchHttp(
      "https://api.replicate.com/v1/models/nightmareai/real-esrgan",
      { dispatcher, headers, signal: AbortSignal.timeout(30000) },
    );
    if (!model.ok)
      throw new Error(`Replicate model lookup returned ${model.status}`);
    version = ((await model.json()) as any).latest_version?.id;
    if (!version || !/^[a-f0-9]{64}$/.test(version))
      throw new Error("Replicate did not return a valid Real-ESRGAN version");
  }
  const response = await fetchHttp("https://api.replicate.com/v1/predictions", {
    method: "POST",
    dispatcher,
    headers,
    body: JSON.stringify({
      version,
      input: {
        image: `data:image/webp;base64,${bytes.toString("base64")}`,
        scale,
        face_enhance: false,
      },
    }),
    signal: AbortSignal.timeout(30000),
  });
  if (!response.ok) throw new Error(`Replicate returned ${response.status}`);
  let prediction: any = await response.json();
  for (let i = 0; i < 120; i++) {
    if (prediction.status === "succeeded") {
      const url = Array.isArray(prediction.output)
        ? prediction.output[0]
        : prediction.output;
      return {
        bytes: await remote(url, 40 * 1024 * 1024),
        status: "AI-enhanced · Real-ESRGAN (Replicate)",
      };
    }
    if (["failed", "canceled"].includes(prediction.status))
      throw new Error("AI prediction failed");
    await new Promise((r) => setTimeout(r, 2000));
    const r = await fetchHttp(
      `https://api.replicate.com/v1/predictions/${encodeURIComponent(prediction.id)}`,
      { dispatcher, headers, signal: AbortSignal.timeout(30000) },
    );
    if (!r.ok) throw new Error(`Replicate poll returned ${r.status}`);
    prediction = await r.json();
  }
  throw new Error("AI prediction timed out");
}
