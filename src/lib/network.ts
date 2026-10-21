import { fetch as fetchHttp, ProxyAgent, Agent } from "undici";
import { lookup } from "node:dns";
import { isIP } from "node:net";
const defaultHosts = [
  "api.openverse.org",
  "commons.wikimedia.org",
  "upload.wikimedia.org",
  "thumb.wikimedia.org",
  "images-api.nasa.gov",
  "images-assets.nasa.gov",
  "api.replicate.com",
  "replicate.delivery",
  "pbxt.replicate.delivery",
];
export function permittedUrl(value: string) {
  const u = new URL(value);
  const extra = (process.env.IMAGE_ALLOWED_HOSTS || "")
    .split(",")
    .map((x) => x.trim())
    .filter(Boolean);
  if (
    u.protocol !== "https:" ||
    u.username ||
    u.password ||
    (u.port && u.port !== "443") ||
    isIP(u.hostname) ||
    ![...defaultHosts, ...extra].includes(u.hostname)
  )
    throw new Error("Remote hostname is not approved");
  return u;
}
function privateIp(ip: string) {
  return (
    /^(127\.|10\.|0\.|169\.254\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.|::|fc|fd|fe80:)/i.test(
      ip,
    ) || ip.includes(":")
  );
}
const direct = new Agent({
  connect: {
    lookup: (hostname, options, callback) => {
      lookup(hostname, { family: 4, all: true }, (error, addresses) => {
        if (error) return callback(error, [], 4);
        if (!addresses.length || addresses.some((a) => privateIp(a.address)))
          return callback(new Error("Private destination rejected"), [], 4);
        if ((options as any).all) callback(null, addresses as any);
        else callback(null, addresses[0].address, 4);
      });
    },
  },
});
const proxyDispatcher = process.env.HTTPS_PROXY
  ? new ProxyAgent(process.env.HTTPS_PROXY)
  : undefined;
export async function remote(url: string, max = 20 * 1024 * 1024) {
  let current = url;
  for (let i = 0; i < 4; i++) {
    const u = permittedUrl(current);
    const r = await fetchHttp(u, {
      dispatcher: proxyDispatcher || direct,
      redirect: "manual",
      signal: AbortSignal.timeout(30000),
      headers: {
        "User-Agent":
          process.env.SOURCE_USER_AGENT ||
          "Wallspace/1.0 (+https://github.com/Harmedino/wallpaper)",
      },
    });
    if (r.status >= 300 && r.status < 400) {
      const next = r.headers.get("location");
      await r.body?.cancel();
      if (!next) throw new Error("Invalid redirect");
      current = new URL(next, u).href;
      continue;
    }
    if (!r.ok) {
      await r.body?.cancel();
      throw new Error(`Remote service returned ${r.status}`);
    }
    if (Number(r.headers.get("content-length") || 0) > max) {
      await r.body?.cancel();
      throw new Error("Remote file too large");
    }
    const chunks: Buffer[] = [];
    let size = 0;
    for await (const chunk of r.body!) {
      size += chunk.length;
      if (size > max) {
        await r.body?.cancel();
        throw new Error("Remote file too large");
      }
      chunks.push(Buffer.from(chunk));
    }
    return Buffer.concat(chunks);
  }
  throw new Error("Too many redirects");
}
export async function remoteJson(url: string): Promise<any> {
  return JSON.parse((await remote(url, 4 * 1024 * 1024)).toString());
}
