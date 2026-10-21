import { remote } from "./network";
import { fetch as fetchHttp, ProxyAgent, FormData } from "undici";
import sharp from "sharp";
// A self-hosted Real-ESRGAN HTTP service accepts multipart `image` and returns image bytes.
export async function upscale(
  bytes: Buffer,
): Promise<{ bytes: Buffer; status: string }> {
  const provider = process.env.AI_PROVIDER || "none";
  if (provider === "none")
    return { bytes, status: "resized — AI provider not configured" };
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
  if (!process.env.REPLICATE_API_TOKEN || !process.env.REPLICATE_MODEL_VERSION)
    throw new Error(
      "Replicate token and pinned Real-ESRGAN model version are required",
    );
  const headers = {
    Authorization: `Bearer ${process.env.REPLICATE_API_TOKEN}`,
    "Content-Type": "application/json",
  };
  const response = await fetchHttp("https://api.replicate.com/v1/predictions", {
    method: "POST",
    dispatcher,
    headers,
    body: JSON.stringify({
      version: process.env.REPLICATE_MODEL_VERSION,
      input: {
        image: `data:image/webp;base64,${bytes.toString("base64")}`,
        scale: 4,
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
