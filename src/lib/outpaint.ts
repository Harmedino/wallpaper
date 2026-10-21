import sharp from "sharp";
import { fetch as fetchHttp, ProxyAgent } from "undici";
import { remote } from "./network";
import type { ImageOptions } from "./images";
/** Flux Fill uses a white border mask; the original subject is composited back at full resolution. */
export async function expandBackground(bytes: Buffer, o: ImageOptions) {
  if (
    process.env.OUTPAINT_PROVIDER !== "replicate" ||
    !process.env.REPLICATE_API_TOKEN
  )
    throw new Error(
      "AI background expansion is not configured. Set OUTPAINT_PROVIDER=replicate and REPLICATE_API_TOKEN.",
    );
  let source = sharp(bytes).rotate(o.rotation);
  if (o.flip) source = source.flip();
  if (o.flop) source = source.flop();
  const original = await source.png().toBuffer();
  const scale = Math.min(1, 1536 / Math.max(o.width, o.height)),
    w = Math.max(256, Math.round((o.width * scale) / 16) * 16),
    h = Math.max(256, Math.round((o.height * scale) / 16) * 16);
  const photo = await sharp(original)
      .resize(w, h, { fit: "inside" })
      .png()
      .toBuffer(),
    pm = await sharp(photo).metadata();
  const left = Math.round((w - pm.width!) * o.x),
    top = Math.round((h - pm.height!) * o.y);
  const image = await sharp({
    create: { width: w, height: h, channels: 3, background: "#000000" },
  })
    .composite([{ input: photo, left, top }])
    .png()
    .toBuffer();
  const mask = await sharp(
    Buffer.from(
      `<svg width="${w}" height="${h}"><rect width="100%" height="100%" fill="white"/><rect x="${left}" y="${top}" width="${pm.width}" height="${pm.height}" fill="black"/></svg>`,
    ),
  )
    .png()
    .toBuffer();
  const dispatcher = process.env.HTTPS_PROXY
    ? new ProxyAgent(process.env.HTTPS_PROXY)
    : undefined;
  const headers = {
    Authorization: `Bearer ${process.env.REPLICATE_API_TOKEN}`,
    "Content-Type": "application/json",
  };
  const r = await fetchHttp(
    "https://api.replicate.com/v1/models/black-forest-labs/flux-fill-pro/predictions",
    {
      method: "POST",
      dispatcher,
      headers,
      body: JSON.stringify({
        input: {
          image: `data:image/png;base64,${image.toString("base64")}`,
          mask: `data:image/png;base64,${mask.toString("base64")}`,
          prompt:
            o.outpaintPrompt ||
            "Naturally extend the existing photographic background. Match lighting, perspective, texture and scenery. Preserve the original subject.",
          output_format: "png",
        },
      }),
      signal: AbortSignal.timeout(30000),
    },
  );
  if (!r.ok)
    throw new Error(`Background expansion provider returned ${r.status}`);
  let prediction: any = await r.json();
  for (let i = 0; i < 120; i++) {
    if (prediction.status === "succeeded") {
      const url = Array.isArray(prediction.output)
        ? prediction.output[0]
        : prediction.output;
      const background = await remote(url, 40 * 1024 * 1024);
      const foreground = await sharp(original)
          .resize(o.width, o.height, { fit: "inside" })
          .png()
          .toBuffer(),
        f = await sharp(foreground).metadata();
      return sharp(background, { limitInputPixels: 40_000_000 })
        .resize(o.width, o.height, { fit: "cover" })
        .composite([
          {
            input: foreground,
            left: Math.round((o.width - f.width!) * o.x),
            top: Math.round((o.height - f.height!) * o.y),
          },
        ])
        .png()
        .toBuffer();
    }
    if (["failed", "canceled"].includes(prediction.status))
      throw new Error("AI background expansion failed");
    await new Promise((resolve) => setTimeout(resolve, 2000));
    const next = await fetchHttp(
      `https://api.replicate.com/v1/predictions/${encodeURIComponent(prediction.id)}`,
      { dispatcher, headers, signal: AbortSignal.timeout(30000) },
    );
    if (!next.ok)
      throw new Error(`Background expansion poll returned ${next.status}`);
    prediction = await next.json();
  }
  throw new Error("AI background expansion timed out");
}
