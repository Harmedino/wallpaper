import { WallpaperWorkspace } from "@/components/wallpaper-workspace";
import { WallpaperCard } from "@/components/wallpaper-card";
import { WallpaperActions } from "@/components/wallpaper-actions";
import { db } from "@/lib/db";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, ArrowUpRight } from "lucide-react";
import { attribution } from "@/lib/licenses";
export const dynamic = "force-dynamic";
export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const w = await db.wallpaper.findUnique({ where: { id, published: true } });
  return {
    title: w?.title || "Wallpaper not found",
    description: w
      ? `${w.title} by ${w.creator}. ${w.width} × ${w.height}. ${w.license}.`
      : undefined,
  };
}
export default async function Detail({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const w = await db.wallpaper.findUnique({ where: { id, published: true } });
  if (!w) notFound();
  const native4K =
    Math.min(w.width, w.height) >= 2160 && Math.max(w.width, w.height) >= 3840;
  const qualityClass = !w.verifiedAt
    ? "Source dimensions listed"
    : native4K
      ? /^AI-enhanced/i.test(w.aiStatus || "")
        ? "AI-Upscaled 4K"
        : "Native 4K"
      : Math.min(w.width, w.height) >= 1080
        ? "Standard HD"
        : "Lower Resolution";
  const related = await db.wallpaper.findMany({
    where: { category: w.category, published: true, id: { not: id } },
    take: 3,
  });
  const variants = await (
    await import("@/lib/db")
  ).database
    .collection("fittedVariants")
    .find({ wallpaperId: id })
    .sort({ verifiedAt: -1 })
    .limit(6)
    .toArray();
  return (
    <div className="shell detail-page">
      <Link href="/explore" className="detail-back">
        <ArrowLeft size={15} />
        Back to wallpapers
      </Link>
      <header className="detail-title">
        <div>
          <p className="eyebrow">{w.category}</p>
          <h1>
            {w.title.replace(/\.(jpe?g|png|webp)$/i, "").replace(/_/g, " ")}
          </h1>
          <p className="muted">
            By {w.creator} · {w.downloads} downloads
          </p>
        </div>
        <WallpaperActions
          compact
          id={id}
          title={w.title}
          width={w.width}
          height={w.height}
        />
      </header>
      <WallpaperWorkspace
        wallpaper={{
          id,
          title: w.title,
          width: w.width,
          height: w.height,
          verifiedAt: w.verifiedAt ? String(w.verifiedAt) : null,
          aiStatus: w.aiStatus,
        }}
      />
      <section className="detail-provenance">
        <details>
          <summary>Original image, quality and license</summary>
          <div className="detail-facts">
            <span>
              <strong>
                {w.width} × {w.height}
              </strong>
              Listed original dimensions
            </span>
            <span>
              <strong>{w.width >= w.height ? "Landscape" : "Portrait"}</strong>
              Original orientation
            </span>
            <span>
              <strong>{qualityClass}</strong>
              {w.verifiedAt
                ? "Original file verified"
                : "Metadata; the preview verifies the original file"}
            </span>
          </div>
          <p className="muted">
            {w.originalFormat || w.format || "Format checked on load"}
            {w.fileSize ? ` · ${(w.fileSize / 1024 / 1024).toFixed(1)} MB` : ""}
          </p>
          <pre className="attribution-text">{attribution(w as any)}</pre>
          <div className="flex flex-wrap gap-4 text-sm">
            <a href={w.licenseUrl} target="_blank" rel="noreferrer">
              Read license ↗
            </a>
            <a href={w.sourceUrl} target="_blank" rel="noreferrer">
              Original source ↗
            </a>
            <a href={`/api/wallpapers/${id}/attribution`}>
              Download attribution
            </a>
            <Link href="/copyright">Report this image</Link>
          </div>
          {variants.length > 0 && (
            <div className="mt-5">
              <h3>Verified generated files</h3>
              {variants.map((v) => (
                <p className="text-xs muted" key={v.key}>
                  {v.width} × {v.height} · {v.format.toUpperCase()} · {v.fit} ·
                  metadata checked {new Date(v.verifiedAt).toLocaleDateString()}
                </p>
              ))}
            </div>
          )}
        </details>
      </section>
      {related.length > 0 && (
        <section className="home-section">
          <div className="section-heading">
            <h2>More like this</h2>
            <Link href={`/explore?category=${encodeURIComponent(w.category)}`}>
              Explore category →
            </Link>
          </div>
          <div className="wall-grid">
            {related.map((r) => (
              <WallpaperCard
                key={r.id}
                wallpaper={{
                  id: r.id,
                  title: r.title,
                  width: r.width,
                  height: r.height,
                  category: r.category,
                  verifiedAt: r.verifiedAt ? String(r.verifiedAt) : null,
                  aiStatus: r.aiStatus,
                }}
              />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
