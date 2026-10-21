import { DevicePreview } from "@/components/device-preview";
import { WallpaperActions } from "@/components/wallpaper-actions";
import { db } from "@/lib/db";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, ArrowUpRight } from "lucide-react";
import { DownloadPanel } from "@/components/download-panel";
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
  const qualityClass = native4K
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
  return (
    <div className="shell pt-10">
      <Link href="/explore" className="text-xs muted flex gap-2 mb-8">
        <ArrowLeft size={14} /> Back to the collection
      </Link>
      <div className="grid lg:grid-cols-[1.5fr_1fr] gap-8">
        <div>
          <img
            className="w-full rounded-2xl"
            src={`/api/wallpapers/${id}/thumbnail`}
            alt={w.title}
            width={1100}
            height={619}
          />
          <div className="flex justify-between gap-4 items-center mt-6">
            <div>
              <p className="eyebrow">{w.category}</p>
              <h1 className="text-4xl tracking-tight">{w.title}</h1>
            </div>
            <span className="chip">{w.downloads} downloads</span>
          </div>
          <div className="grid grid-cols-3 text-sm gap-6 py-5 border-y border-white/10">
            <div>
              <p className="muted text-xs">Original dimensions</p>
              {w.width} × {w.height}
            </div>
            <div>
              <p className="muted text-xs">Aspect ratio</p>
              {(w.width / w.height).toFixed(2)}:1
            </div>
            <div>
              <p className="muted text-xs">Processing</p>
              {w.aiStatus}
            </div>
          </div>
          <div className="panel mt-5 text-sm">
            <strong>{qualityClass}</strong>
            <p className="muted text-xs mt-2">
              Actual source: {w.width} × {w.height} pixels ·{" "}
              {w.format || "Format verified when the original is loaded"} ·{" "}
              {w.verifiedAt
                ? "Original file verified"
                : "Source metadata; original verification pending"}
            </p>
            {w.quality && (
              <p className="muted text-xs mt-2">
                Detail score: {w.quality.detailScore} · Heuristic analysis;
                sharpness cannot be guaranteed.
              </p>
            )}
          </div>
          <div className="mt-5 flex flex-wrap gap-2">
            {w.tags?.map((tag: string) => (
              <Link
                key={tag}
                className="chip"
                href={`/explore?q=${encodeURIComponent(tag)}`}
              >
                {tag}
              </Link>
            ))}
          </div>
          <p className="text-xs muted mt-4">
            {w.width >= w.height ? "Landscape" : "Portrait"} ·{" "}
            {native4K
              ? "High resolution source — native pixels"
              : "Original resolution source; 4K exports may require enlargement"}{" "}
            · {w.downloads} downloads
          </p>
          <div className="panel mt-6">
            <h2 className="text-lg">The story & the credit</h2>
            <p className="text-sm muted">
              Created by <span className="text-slate-200">{w.creator}</span> ·{" "}
              {w.source}
            </p>
            <pre className="whitespace-pre-wrap text-xs leading-6 text-slate-400 font-sans">
              {attribution(w as any)}
            </pre>
            <div className="flex flex-wrap gap-4 text-xs text-teal-200">
              <a href={w.licenseUrl} target="_blank" rel="noreferrer">
                Read license <ArrowUpRight size={12} className="inline" />
              </a>
              <a href={w.sourceUrl} target="_blank" rel="noreferrer">
                Original source <ArrowUpRight size={12} className="inline" />
              </a>
              <a href={`/api/wallpapers/${id}/attribution`}>
                Download attribution
              </a>
              <Link href="/copyright">Report this image</Link>
            </div>
          </div>
        </div>
        <div>
          <div className="panel mb-5">
            <DevicePreview wallpaper={{ id, title: w.title }} />
          </div>
          <DownloadPanel id={id} />
          <WallpaperActions id={id} title={w.title} />
          <p className="text-xs muted leading-6 mt-5 px-2">
            Respect the creator. Keep attribution with your download and follow
            the linked license when sharing or adapting this image.
          </p>
        </div>
      </div>
      {related.length > 0 && (
        <section className="mt-16">
          <h2 className="text-2xl mb-6">A similar state of mind.</h2>
          <div className="grid sm:grid-cols-3 gap-5">
            {related.map((r) => (
              <Link key={r.id} href={`/wallpaper/${r.id}`}>
                <img
                  className="rounded-xl w-full"
                  loading="lazy"
                  src={`/api/wallpapers/${r.id}/thumbnail`}
                  alt={r.title}
                  width={600}
                  height={338}
                />
                <h3 className="mt-3 text-sm">{r.title}</h3>
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
