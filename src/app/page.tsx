import Link from "next/link";
import {
  ArrowUpRight,
  Sparkles,
  Monitor,
  Smartphone,
  Check,
  ArrowRight,
} from "lucide-react";
import { Gallery } from "@/components/gallery";
import { Button } from "@/components/ui/button";
export const dynamic = "force-dynamic";
import { ensureStarterCatalog } from "@/lib/starter-catalog";
import { db } from "@/lib/db";
export default async function Home() {
  await ensureStarterCatalog();
  const hero = await db.wallpaper.findMany({
    where: { published: true, featured: true },
    take: 1,
  });
  return (
    <>
      <div className="shell pt-8">
        <section className="relative overflow-hidden rounded-3xl min-h-135 flex items-center bg-[#10283c] fade-in">
          {hero[0] && (
            <img
              src={`/api/wallpapers/${hero[0].id}/thumbnail`}
              alt="Original aurora-inspired abstract waves"
              className="absolute inset-0 w-full h-full object-cover"
            />
          )}
          <div className="absolute inset-0 bg-linear-to-r from-[#06141d]/95 via-[#071621]/60 to-transparent" />
          <div className="relative z-10 p-8 md:p-16 max-w-2xl">
            <p className="eyebrow flex items-center gap-2 mb-7">
              <span className="w-1.5 h-1.5 bg-teal-300 rounded-full" /> A NEW
              PERSPECTIVE, EVERY DAY
            </p>
            <h1 className="text-5xl md:text-7xl leading-[1.03] tracking-[-.06em] font-medium mb-6">
              Your screen.
              <br />
              Your state of{" "}
              <span className="text-teal-200 italic font-serif">mind.</span>
            </h1>
            <p className="text-slate-300 text-sm leading-7 max-w-sm mb-8">
              Extraordinary wallpapers for your everyday spaces. Discover your
              next view, or create something entirely your own.
            </p>
            <div className="flex flex-wrap gap-3">
              <Button asChild>
                <Link href="/explore">
                  Find your wallpaper <ArrowUpRight size={16} />
                </Link>
              </Button>
              <Button variant="outline" asChild>
                <Link href="/studio">
                  <Sparkles size={15} /> Open AI Studio
                </Link>
              </Button>
            </div>
            <div className="flex gap-5 mt-10 text-[10px] text-slate-400">
              <span className="flex gap-1.5 items-center">
                <Check size={12} className="text-teal-300" /> Real 4K downloads
              </span>
              <span className="flex gap-1.5 items-center">
                <Check size={12} className="text-teal-300" /> Responsible
                sourcing
              </span>
              <span className="flex gap-1.5 items-center">
                <Check size={12} className="text-teal-300" /> Made for every
                screen
              </span>
            </div>
          </div>
          <span className="absolute bottom-6 right-7 text-[10px] text-white/40 hide-mobile">
            {hero[0]?.title.toUpperCase()} — ORIGINAL PROCEDURAL ART
          </span>
        </section>
        <div className="flex flex-wrap justify-between py-8 border-b border-white/8 mb-14 gap-5 text-xs text-slate-500">
          <span>LESS NOISE. MORE INSPIRATION.</span>
          <div className="flex gap-6">
            <Link
              href="/explore?orientation=landscape"
              className="flex gap-2 items-center"
            >
              <Monitor size={14} />
              Desktop & laptop
            </Link>
            <Link
              href="/explore?orientation=portrait"
              className="flex gap-2 items-center"
            >
              <Smartphone size={14} />
              Phone & tablet
            </Link>
            <span className="hide-mobile">JPG · PNG · WebP</span>
          </div>
        </div>
        <Gallery compact />
        <section className="my-16 rounded-3xl border border-teal-200/15 bg-linear-to-br from-teal-900/20 to-indigo-900/10 p-8 md:p-12 flex flex-wrap items-center justify-between gap-8">
          <div>
            <p className="eyebrow mb-3">YOUR IMAGE. A BIGGER POSSIBILITY.</p>
            <h2 className="text-3xl md:text-4xl font-medium tracking-tight mb-4">
              Make it unmistakably yours.
            </h2>
            <p className="muted text-sm max-w-md leading-6">
              Bring your own photo. Find the perfect crop. Refine its colors.
              Create a wallpaper made for your screen, privately.
            </p>
            <Button asChild className="mt-3">
              <Link href="/studio">
                <Sparkles size={16} /> Try Wallpaper Studio{" "}
                <ArrowRight size={16} />
              </Link>
            </Button>
          </div>
          <div className="flex gap-3 items-end" aria-hidden="true">
            <div className="w-48 h-30 rounded-xl border-4 border-slate-600 bg-linear-to-br from-teal-300 via-teal-900 to-indigo-900 shadow-2xl" />
            <div className="w-16 h-32 rounded-xl border-4 border-slate-600 bg-linear-to-br from-teal-300 via-teal-900 to-indigo-900" />
          </div>
        </section>
        <section className="grid md:grid-cols-3 gap-8 mb-10">
          {[
            [
              "01",
              "Choose a perspective",
              "Browse original artwork and administrator-reviewed, openly licensed photography.",
            ],
            [
              "02",
              "Make it fit",
              "Download a real file in the resolution and format that works for your device.",
            ],
            [
              "03",
              "Give credit",
              "Creator, license and modification information stay accessible with every wallpaper.",
            ],
          ].map(([n, t, d]) => (
            <div key={n}>
              <span className="text-teal-300 text-xs">{n} /</span>
              <h3 className="mt-4 mb-3 text-lg">{t}</h3>
              <p className="muted text-sm leading-6">{d}</p>
            </div>
          ))}
        </section>
      </div>
    </>
  );
}
