import type { Metadata } from "next";
import Link from "next/link";
import { Aperture, ArrowUpRight, Sparkles } from "lucide-react";
import "./globals.css";
export const metadata: Metadata = {
  metadataBase: new URL(process.env.APP_URL || "http://localhost:3000"),
  title: {
    default: "Wallspace — A fresh perspective",
    template: "%s | Wallspace",
  },
  description:
    "Discover thoughtfully curated wallpapers. Make your screen your own with original 4K art and a private wallpaper studio.",
};
export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <header className="border-b border-white/8">
          <div className="shell flex h-22 items-center justify-between gap-4">
            <Link
              href="/"
              className="flex items-center gap-2.5 text-xl font-semibold tracking-tight"
            >
              <Aperture size={26} className="text-teal-300" />
              wallspace<span className="text-teal-300">.</span>
            </Link>
            <nav aria-label="Main navigation" className="nav-links">
              <Link href="/explore">Explore</Link>
              <Link href="/categories" className="hide-mobile">
                Categories
              </Link>
              <Link href="/trending" className="hide-mobile">
                Trending
              </Link>
              <Link
                href="/studio"
                className="text-teal-200 flex items-center gap-2"
              >
                <Sparkles size={14} /> AI Studio
              </Link>
              <Link href="/smart-fit" className="hide-mobile">
                Smart Fit
              </Link>
              <Link href="/football-creator" className="hide-mobile">
                Football
              </Link>
            </nav>
            <Link
              href="/uploads"
              className="text-xs text-slate-400 hide-tablet"
            >
              My uploads <ArrowUpRight className="inline ml-1" size={14} />
            </Link>
          </div>
        </header>
        <main>{children}</main>
        <footer className="border-t border-white/8 mt-24 py-12">
          <div className="shell flex flex-wrap gap-8 items-start justify-between">
            <div>
              <Link href="/" className="text-xl font-semibold">
                wallspace<span className="text-teal-300">.</span>
              </Link>
              <p className="muted text-xs mt-3">
                A little inspiration. Every time you look.
              </p>
            </div>
            <nav
              className="flex flex-wrap gap-6 text-xs text-slate-400"
              aria-label="Footer"
            >
              <Link href="/latest">Latest</Link>
              <Link href="/privacy">Privacy</Link>
              <Link href="/terms">Terms</Link>
              <Link href="/copyright">Copyright & removal</Link>
              <Link href="/admin">Admin</Link>
              <Link href="/smart-fit" className="hide-mobile">
                Smart Fit
              </Link>
              <Link href="/football-creator" className="hide-mobile">
                Football
              </Link>
            </nav>
            <p className="muted text-xs">
              Curated with care. Download with credit.
            </p>
          </div>
        </footer>
      </body>
    </html>
  );
}
