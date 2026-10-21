import type { MetadataRoute } from "next";
import { db } from "@/lib/db";
export const dynamic = "force-dynamic";
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = process.env.APP_URL || "http://localhost:3000";
  const w = await db.wallpaper.findMany({
    where: { published: true },
    take: 10000,
  });
  return [
    ...[
      "",
      "/explore",
      "/categories",
      "/trending",
      "/latest",
      "/privacy",
      "/terms",
      "/copyright",
    ].map((p) => ({ url: base + p, lastModified: new Date() })),
    ...w.map((r) => ({
      url: `${base}/wallpaper/${r.id}`,
      lastModified: r.updatedAt || r.createdAt,
    })),
  ];
}
