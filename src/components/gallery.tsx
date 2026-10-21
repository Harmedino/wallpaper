"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowUpRight,
  Search,
  SlidersHorizontal,
  ArrowLeft,
  ArrowRight,
  Download,
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
export function Gallery({
  mode = "explore",
  initialCategory = "",
  compact = false,
}: {
  mode?: string;
  initialCategory?: string;
  compact?: boolean;
}) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState(initialCategory);
  const [orientation, setOrientation] = useState("");
  const [color, setColor] = useState("");
  const [resolution, setResolution] = useState("");
  const [sort, setSort] = useState(mode === "trending" ? "popular" : "latest");
  const [page, setPage] = useState(1);
  const [data, setData] = useState<{
    items: Wallpaper[];
    total: number;
    pages: number;
  }>({ items: [], total: 0, pages: 0 });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState(false);
  useEffect(() => {
    const p = new URLSearchParams(window.location.search);
    if (p.get("category")) setCategory(p.get("category")!);
    if (p.get("orientation")) setOrientation(p.get("orientation")!);
  }, []);
  useEffect(() => {
    const c = new AbortController();
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
        if (!c.signal.aborted)
          setError(e instanceof Error ? e.message : "Gallery unavailable");
      } finally {
        if (!c.signal.aborted) setLoading(false);
      }
    }, 200);
    return () => {
      clearTimeout(t);
      c.abort();
    };
  }, [query, category, orientation, color, resolution, sort, page]);
  return (
    <section className="fade-in">
      <div className="flex flex-wrap items-end justify-between gap-5 mb-7">
        <div>
          <p className="eyebrow mb-3">THE COLLECTION</p>
          <h2 className="text-3xl font-medium tracking-tight mb-2">
            {compact
              ? "Find your next view"
              : mode === "trending"
                ? "Worth a second look"
                : mode === "latest"
                  ? "Fresh perspectives"
                  : "Explore wallpapers"}
            <span className="text-teal-300">.</span>
          </h2>
          <p className="muted text-sm">
            Original art. Thoughtfully sourced images. A screen that feels like
            you.
          </p>
        </div>
        {compact ? (
          <Link href="/explore" className="text-sm flex items-center gap-2">
            Explore collection <ArrowUpRight size={16} />
          </Link>
        ) : null}
      </div>
      <div className="flex flex-wrap gap-3 mb-5">
        <div className="relative flex-1 min-w-52">
          <Search
            className="absolute left-4 top-3.5 text-slate-500"
            size={18}
          />
          <input
            aria-label="Search wallpapers"
            placeholder="Search a mood, color, or place…"
            className="w-full pl-12"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setPage(1);
            }}
          />
        </div>
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
        <Button
          variant="outline"
          onClick={() => setFilters(!filters)}
          aria-expanded={filters}
        >
          <SlidersHorizontal size={15} />
          Filters
        </Button>
      </div>
      {filters && (
        <div className="panel flex flex-wrap gap-4 mb-5">
          <label className="field">
            Orientation
            <select
              value={orientation}
              onChange={(e) => {
                setOrientation(e.target.value);
                setPage(1);
              }}
            >
              <option value="">All orientations</option>
              <option value="landscape">Desktop</option>
              <option value="portrait">Phone</option>
            </select>
          </label>
          <label className="field">
            Color
            <select
              value={color}
              onChange={(e) => {
                setColor(e.target.value);
                setPage(1);
              }}
            >
              <option value="">All colors</option>
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
              <option value="">All resolutions</option>
              <option value="4k">4K and above</option>
            </select>
          </label>
        </div>
      )}
      <div className="flex gap-2 overflow-x-auto pb-5 mb-3">
        <button
          className={"chip " + (!category ? "active" : "")}
          onClick={() => {
            setCategory("");
            setPage(1);
          }}
        >
          All wallpapers
        </button>
        {categories.map((c) => (
          <button
            key={c}
            className={"chip " + (category === c ? "active" : "")}
            onClick={() => {
              setCategory(c);
              setPage(1);
            }}
          >
            {c}
          </button>
        ))}
      </div>
      <div className="flex justify-between text-xs text-slate-500 mb-5">
        <span>
          {loading ? "Finding your inspiration…" : `${data.total} wallpapers`}
        </span>
        <span>Free to download · Attribution where required</span>
      </div>
      {error ? (
        <div role="alert" className="error">
          {error}
        </div>
      ) : null}
      {!loading && !data.items.length && !error ? (
        <div className="panel text-center py-20">
          <h3 className="text-xl">A little room for something new.</h3>
          <p className="muted">
            No wallpapers match these filters. Try another search or browse all
            artwork.
          </p>
          <Button
            variant="outline"
            onClick={() => {
              setCategory("");
              setQuery("");
              setColor("");
              setOrientation("");
              setResolution("");
            }}
          >
            Clear filters
          </Button>
        </div>
      ) : null}
      <div className="masonry" aria-busy={loading}>
        {data.items.slice(0, compact ? 6 : 18).map((w, i) => (
          <Link href={`/wallpaper/${w.id}`} className="wall-card" key={w.id}>
            <img
              alt={w.title}
              src={`/api/wallpapers/${w.id}/thumbnail`}
              loading={i < 3 ? "eager" : "lazy"}
              width={1100}
              height={i % 3 === 1 ? 1000 : i % 3 === 2 ? 680 : 820}
              style={{
                aspectRatio:
                  i % 3 === 1 ? "1.1" : i % 3 === 2 ? "1.62" : "1.34",
                objectFit: "cover",
              }}
            />
            <div className="absolute top-4 left-4 rounded-full bg-black/30 border border-white/20 text-[10px] px-2.5 py-1 backdrop-blur-md">
              {w.width >= 3840 ? "4K UHD" : "HD"}
            </div>
            <div className="card-overlay">
              <div className="flex w-full justify-between items-end gap-2">
                <div>
                  <p className="text-[10px] uppercase tracking-widest text-white/60 mb-2">
                    {w.category}
                  </p>
                  <h3 className="text-lg font-medium mb-1">{w.title}</h3>
                  <p className="text-xs text-white/50 mb-0">
                    {w.width} × {w.height}
                  </p>
                </div>
                <span className="bg-white/10 rounded-full p-2.5">
                  <Download size={17} />
                </span>
              </div>
            </div>
          </Link>
        ))}
      </div>
      {!compact && data.pages > 1 ? (
        <div className="flex justify-center gap-4 mt-8">
          <Button
            variant="outline"
            disabled={page === 1}
            onClick={() => setPage(page - 1)}
          >
            <ArrowLeft size={16} /> Previous
          </Button>
          <span className="text-sm py-3">
            {page} / {data.pages}
          </span>
          <Button
            variant="outline"
            disabled={page >= data.pages}
            onClick={() => setPage(page + 1)}
          >
            Next <ArrowRight size={16} />
          </Button>
        </div>
      ) : null}
    </section>
  );
}
