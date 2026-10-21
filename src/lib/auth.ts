import { cookies } from "next/headers";
import {
  createHmac,
  randomBytes,
  timingSafeEqual,
  scryptSync,
} from "node:crypto";
import { db } from "./db";
export class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}
function secret() {
  const s = process.env.SESSION_SECRET;
  if (!s || s.length < 32)
    throw new HttpError(
      503,
      "Set SESSION_SECRET to at least 32 random characters.",
    );
  return s;
}
export function sign(id: string, role: string) {
  const data = Buffer.from(
    JSON.stringify({ id, role, exp: Date.now() + 7 * 86400000 }),
  ).toString("base64url");
  return (
    data + "." + createHmac("sha256", secret()).update(data).digest("base64url")
  );
}
export function verify(
  token: string | undefined,
): { id: string; role: string } | null {
  if (!token) return null;
  const [data, sig] = token.split(".");
  if (!data || !sig) return null;
  const expected = createHmac("sha256", secret())
    .update(data)
    .digest("base64url");
  if (
    sig.length !== expected.length ||
    !timingSafeEqual(Buffer.from(sig), Buffer.from(expected))
  )
    return null;
  try {
    const v = JSON.parse(Buffer.from(data, "base64url").toString());
    return v.exp > Date.now() &&
      typeof v.id === "string" &&
      ["visitor", "admin"].includes(v.role)
      ? { id: v.id, role: v.role }
      : null;
  } catch {
    return null;
  }
}
export async function session(create = false) {
  const jar = await cookies();
  let user = verify(jar.get("wallpaper-session")?.value);
  if (!user && create) {
    const row = await db.user.create({ data: {} });
    user = { id: row.id, role: "visitor" };
    jar.set("wallpaper-session", sign(user.id, user.role), {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 604800,
    });
  }
  return user;
}
export async function admin() {
  const u = await session();
  if (u?.role !== "admin")
    throw new HttpError(401, "Administrator sign-in required.");
  return u;
}
export function checkPassword(password: string) {
  const encoded = process.env.ADMIN_PASSWORD_HASH;
  if (!encoded)
    throw new HttpError(503, "Administrator password is not configured.");
  const [salt, hash] = encoded.split(":");
  if (!salt || !hash) return false;
  const actual = scryptSync(password, salt, 64).toString("hex");
  return (
    actual.length === hash.length &&
    timingSafeEqual(Buffer.from(actual), Buffer.from(hash))
  );
}
export function originCheck(req: Request) {
  const origin = req.headers.get("origin");
  const expected = process.env.APP_URL || new URL(req.url).origin;
  if (origin && origin !== expected)
    throw new HttpError(403, "Cross-origin request rejected.");
  if (req.headers.get("sec-fetch-site") === "cross-site")
    throw new HttpError(403, "Cross-site request rejected.");
}
export async function rateLimit(key: string, max: number, seconds = 3600) {
  const now = new Date();
  await db.rateLimit.deleteMany({ where: { key, expiresAt: { lt: now } } });
  const row = await db.rateLimit.upsert({
    where: { key },
    create: { key, expiresAt: new Date(Date.now() + seconds * 1000) },
    update: { count: { increment: 1 } },
  });
  if (row.count > max)
    throw new HttpError(429, "Rate limit reached. Please try again later.");
}
export const randomSecret = () => randomBytes(32).toString("hex");
