"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { WallpaperThumbnail } from "./wallpaper-thumbnail";
import { PhonePreview } from "./phone-preview";
import {
  ArrowUpRight,
  Search,
  SlidersHorizontal,
  ArrowLeft,
  ArrowRight,
  Download,
  Sparkles,
  Monitor,
  Smartphone,
  LayoutGrid,
  Grid2X2,
  RefreshCw,
  ImageOff,
  X,
} from "lucide-react";
import { categories } from "@/lib/constants";
import { Button } from "./ui/button";
type Wallpaper = {
  id: string;
  title: string;
  category: string;
  width: number;
  height: number;
  downloads: number;
  color: string;
  aiStatus: string;
};
const short: Record<string, string> = {
  "Nature and landscapes": "Nature",
  "Mountains and forests": "Mountains",
  "Ocean and beaches": "Ocean",
  "Space and galaxies": "Space",
  "Cars and motorcycles": "Automotive",
  "Cities and skylines": "Cities",
  "Dark and AMOLED": "Dark",
  "Fantasy and digital art": "Fantasy",
  "Anime-style art": "Anime",
};
export function Gallery({
  mode = "explore",
  initialCategory = "",
  compact = false,
}: {
  mode?: string;
  initialCategory?: string;
  compact?: boolean;
}) {
  const [phonePreview, setPhonePreview] = useState<Wallpaper | null>(null);
  const [query, setQuery] = useState(""),
    [category, setCategory] = useState(initialCategory),
    [orientation, setOrientation] = useState(""),
    [color, setColor] = useState(""),
    [resolution, setResolution] = useState(""),
    [sort, setSort] = useState(mode === "trending" ? "popular" : "latest"),
    [page, setPage] = useState(1),
    [data, setData] = useState<{
      items: Wallpaper[];
      total: number;
      pages: number;
      refreshing?: boolean;
    }>({ items: [], total: 0, pages: 0 }),
    [error, setError] = useState(""),
    [loading, setLoading] = useState(true),
    [filters, setFilters] = useState(false),
    [dense, setDense] = useState(false),
    [retry, setRetry] = useState(0);
  useEffect(() => {
    const p = new URLSearchParams(window.location.search);
    if (p.get("category")) setCategory(p.get("category")!);
    if (p.get("orientation")) setOrientation(p.get("orientation")!);
  }, []);
  useEffect(() => {
    const c = new AbortController();
    setLoading(true);
    const t = setTimeout(async () => {
      setLoading(true);
      setError("");
      try {
        const p = new URLSearchParams({
          q: query,
          category,
          orientation,
          color,
          resolution,
          sort,
          page: String(page),
        });
        const r = await fetch("/api/wallpapers?" + p, { signal: c.signal });
        const d = await r.json();
        if (!r.ok) throw new Error(d.error);
        setData(d);
      } catch (e) {
        if (!c.signal.aborted) {
          setError(e instanceof Error ? e.message : "Gallery unavailable");
          setData({ items: [], total: 0, pages: 0 });
        }
      } finally {
        if (!c.signal.aborted) setLoading(false);
      }
    }, 200);
    return () => {
      clearTimeout(t);
      c.abort();
    };
  }, [query, category, orientation, color, resolution, sort, page, retry]);
  useEffect(() => {
    if (!data.refreshing) return;
    const timer = setTimeout(() => setRetry((n) => n + 1), 8000);
    return () => clearTimeout(timer);
  }, [data]);
  function reset() {
    setQuery("");
    setCategory("");
    setColor("");
    setOrientation("");
    setResolution("");
    setPage(1);
  }
  function select(c: string) {
    setCategory(c);
    setPage(1);
  }
  const title = compact
    ? "Find your next view"
    : mode === "trending"
      ? "Worth a second look"
      : mode === "latest"
        ? "Fresh perspectives"
        : "Explore wallpapers";
  return (
    <section
      className={"collection fade-in " + (compact ? "collection-compact" : "")}
    >
      {!compact ? (
        <div className="collection-hero">
          <div className="collection-intro">
            <span className="collection-kicker">
              <span /> A LITTLE ESCAPE, EVERY DAY
            </span>
            <h1>
              {title}
              <span>.</span>
            </h1>
            <p>
              A new view can change everything.
              <br />
              Find a wallpaper that feels like <em>you.</em>
            </p>
            <div className="collection-device">
              <button
                className={!orientation ? "selected" : ""}
                onClick={() => {
                  setOrientation("");
                  setPage(1);
                }}
              >
                All screens
              </button>
              <button
                className={orientation === "landscape" ? "selected" : ""}
                onClick={() => {
                  setOrientation("landscape");
                  setPage(1);
                }}
              >
                <Monitor size={14} />
                Desktop
              </button>
              <button
                className={orientation === "portrait" ? "selected" : ""}
                onClick={() => {
                  setOrientation("portrait");
                  setPage(1);
                }}
              >
                <Smartphone size={14} />
                Phone
              </button>
            </div>
          </div>
          <Link href="/studio" className="studio-feature">
            <div className="feature-orbit" aria-hidden="true">
              <i />
              <i />
              <i />
            </div>
            <span className="feature-badge">
              <Sparkles size={12} /> WALLPAPER STUDIO
            </span>
            <div className="feature-copy">
              <p>
                Your photo.
                <br /> A whole new possibility.
              </p>
              <span>
                Create your own wallpaper <ArrowUpRight size={16} />
              </span>
            </div>
            <span className="feature-open">
              <ArrowUpRight size={20} />
            </span>
          </Link>
        </div>
      ) : (
        <div className="flex justify-between items-end mb-8 gap-5">
          <div>
            <p className="eyebrow">THE COLLECTION</p>
            <h2 className="text-4xl tracking-tight font-medium">
              {title}
              <span className="text-teal-300">.</span>
            </h2>
            <p className="muted text-sm mb-0">
              A fresh perspective for your everyday.
            </p>
          </div>
          <Link
            className="text-sm text-teal-200 flex gap-2 items-center"
            href="/explore"
          >
            View all <ArrowUpRight size={16} />
          </Link>
        </div>
      )}
      <div className="collection-toolbar">
        <div className="collection-search">
          <Search size={20} />
          <input
            aria-label="Search wallpapers"
            placeholder="What’s your next view? Search colors, moods, places…"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setPage(1);
            }}
          />
          {query ? (
            <button
              aria-label="Clear search"
              onClick={() => {
                setQuery("");
                setPage(1);
              }}
            >
              <X size={16} />
            </button>
          ) : (
            <kbd className="hide-mobile">SEARCH</kbd>
          )}
        </div>
        <button
          className={"filter-toggle " + (filters ? "selected" : "")}
          aria-expanded={filters}
          onClick={() => setFilters(!filters)}
        >
          <SlidersHorizontal size={16} />
          Filters
          {[color, resolution].filter(Boolean).length > 0 && (
            <span className="filter-dot" />
          )}
        </button>
      </div>
      {filters && (
        <div className="collection-filter-panel">
          <label className="field">
            Color
            <select
              value={color}
              onChange={(e) => {
                setColor(e.target.value);
                setPage(1);
              }}
            >
              <option value="">Any palette</option>
              {["blue", "green", "orange", "purple", "red"].map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
          </label>
          <label className="field">
            Resolution
            <select
              value={resolution}
              onChange={(e) => {
                setResolution(e.target.value);
                setPage(1);
              }}
            >
              <option value="">Every resolution</option>
              <option value="4k">4K and above</option>
            </select>
          </label>
          <button
            className="text-xs text-teal-200 self-end py-3"
            onClick={reset}
          >
            Reset filters
          </button>
        </div>
      )}
      <div className="category-strip">
        <button
          className={"category-tab " + (!category ? "active" : "")}
          onClick={() => select("")}
        >
          Discover all
        </button>
        {categories.map((c) => (
          <button
            key={c}
            className={"category-tab " + (category === c ? "active" : "")}
            onClick={() => select(c)}
            aria-label={c}
          >
            {short[c] || c}
          </button>
        ))}
      </div>
      <div className="collection-meta">
        <div>
          <h2>
            {category
              ? short[category] || category
              : query
                ? "Your search results"
                : mode === "trending"
                  ? "Most loved"
                  : "The latest perspectives"}
          </h2>
          <span>
            {loading
              ? "Finding something good…"
              : error
                ? "Collection unavailable"
                : `${data.total} wallpapers to make your own`}
          </span>
        </div>
        <div className="collection-view">
          <select
            aria-label="Sort wallpapers"
            value={sort}
            onChange={(e) => {
              setSort(e.target.value);
              setPage(1);
            }}
          >
            <option value="latest">Recently added</option>
            <option value="popular">Most downloaded</option>
          </select>
          <div className="view-buttons hide-mobile">
            <button
              aria-label="Comfortable grid"
              aria-pressed={!dense}
              onClick={() => setDense(false)}
            >
              <Grid2X2 size={17} />
            </button>
            <button
              aria-label="Compact grid"
              aria-pressed={dense}
              onClick={() => setDense(true)}
            >
              <LayoutGrid size={17} />
            </button>
          </div>
        </div>
      </div>
      {loading ? (
        <div
          className={"wall-grid " + (dense ? "dense" : "")}
          aria-label="Loading wallpapers"
          aria-busy="true"
        >
          {Array.from({ length: 6 }, (_, i) => (
            <div className="wall-skeleton" key={i}>
              <div />
              <span />
              <span />
            </div>
          ))}
        </div>
      ) : error ? (
        <div role="alert" className="collection-state">
          <span className="state-icon">
            <ImageOff size={26} />
          </span>
          <p className="eyebrow">A MOMENT OUT OF FOCUS</p>
          <h3>We couldn’t load the collection.</h3>
          <p>
            The gallery is temporarily unavailable. Try again in a moment,
            <br className="hide-mobile" /> or bring your own image to the
            Studio.
          </p>
          <div className="flex justify-center flex-wrap gap-3">
            <Button onClick={() => setRetry(retry + 1)}>
              <RefreshCw size={15} />
              Try again
            </Button>
            <Button variant="outline" asChild>
              <Link href="/studio">
                <Sparkles size={15} />
                Open Studio
              </Link>
            </Button>
          </div>
        </div>
      ) : !data.items.length ? (
        <div className="collection-state">
          <span className="state-icon">
            <Search size={26} />
          </span>
          <h3>A new perspective is out there.</h3>
          <p>
            No wallpapers match these filters yet. Try a different mood or
            explore the full collection.
          </p>
          <Button variant="outline" onClick={reset}>
            Clear filters <ArrowRight size={15} />
          </Button>
        </div>
      ) : (
        <div className={"wall-grid " + (dense ? "dense" : "")}>
          {data.items.slice(0, compact ? 6 : 18).map((w, i) => (
            <div className="wall-card" key={w.id}>
              <Link href={`/wallpaper/${w.id}`} className="block">
                <div className="wall-visual">
                  <WallpaperThumbnail
                    id={w.id}
                    title={w.title}
                    eager={i < 3}
                    height={i % 3 === 1 ? 1000 : 740}
                  />
                  <span className="wall-quality">
                    {w.width >= 3840 ? "4K" : "HD"}
                    <span> {w.width >= 3840 ? "ULTRA HD" : "ORIGINAL"}</span>
                  </span>
                  <span className="wall-open">
                    <ArrowUpRight size={18} />
                  </span>
                  <span className="wall-download">
                    <Download size={17} /> View & download
                  </span>
                </div>
                <div className="wall-caption">
                  <div>
                    <h3>{w.title}</h3>
                    <p>
                      {short[w.category] || w.category} <span>·</span> {w.width}{" "}
                      × {w.height}
                    </p>
                  </div>
                  <span
                    className="wall-color"
                    style={{
                      background:
                        (
                          {
                            blue: "#7098c7",
                            purple: "#a08dcc",
                            green: "#6bbaa5",
                            orange: "#dbb484",
                            red: "#d58396",
                          } as Record<string, string>
                        )[w.color] || "#94a3b8",
                    }}
                    aria-label={`${w.color} palette`}
                  />
                </div>
              </Link>
              <button
                className="wall-phone-preview"
                onClick={() => setPhonePreview(w)}
              >
                <Smartphone size={14} /> Preview on phone
              </button>
            </div>
          ))}
        </div>
      )}
      {phonePreview && (
        <PhonePreview
          wallpaper={phonePreview}
          onClose={() => setPhonePreview(null)}
        />
      )}
      {data.refreshing && (
        <p role="status" className="text-xs muted my-5 flex items-center gap-2">
          <RefreshCw size={14} className="animate-spin" />
          Adding more photographs to the collection…
        </p>
      )}
      {!loading && !error && data.pages > 1 && (
        <div className="flex justify-center gap-4 mt-10">
          <Button
            variant="outline"
            disabled={page === 1}
            onClick={() => setPage(page - 1)}
          >
            <ArrowLeft size={16} />
            Previous
          </Button>
          <span className="text-xs py-3 muted">
            {page} / {data.pages}
          </span>
          <Button
            variant="outline"
            disabled={page >= data.pages}
            onClick={() => setPage(page + 1)}
          >
            Next
            <ArrowRight size={16} />
          </Button>
        </div>
      )}
      {!compact && (
        <div className="collection-bottom">
          <span>
            <span className="live-dot" /> Curated with care. Made for your
            screen.
          </span>
          <Link href="/copyright">
            Respect the art. Credit the creator. <ArrowUpRight size={13} />
          </Link>
        </div>
      )}
    </section>
  );
}
