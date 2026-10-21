import Link from "next/link";
import {
  Search,
  ArrowUpRight,
  Monitor,
  Smartphone,
  Sparkles,
} from "lucide-react";
import { database } from "@/lib/db";
import { ensureStarterCatalog } from "@/lib/starter-catalog";
import {
  WallpaperCard,
  type WallpaperCardData,
} from "@/components/wallpaper-card";
export const dynamic = "force-dynamic";
function card(w: any): WallpaperCardData {
  return {
    id: w.id,
    title: w.title,
    width: w.width,
    height: w.height,
    category: w.category,
    aiStatus: w.aiStatus,
    verifiedAt: w.verifiedAt ? String(w.verifiedAt) : null,
  };
}
export default async function Home() {
  await ensureStarterCatalog();
  const rows = (where: any = {}, sort: any = { createdAt: -1 }, limit = 6) =>
    database
      .collection("wallpapers")
      .find({ published: true, ...where })
      .sort(sort)
      .limit(limit)
      .toArray();
  const [
    featured,
    trending,
    latest,
    football,
    phones,
    desktops,
    total,
    categories,
  ] = await Promise.all([
    rows({ remoteUrl: { $exists: true } }, { featured: -1, downloads: -1 }, 4),
    rows({}, { downloads: -1, createdAt: -1 }),
    rows(),
    rows({ category: "Football" }),
    rows({ $expr: { $gt: ["$height", "$width"] } }),
    rows({ $expr: { $gte: ["$width", "$height"] } }),
    database.collection("wallpapers").countDocuments({ published: true }),
    database
      .collection("wallpapers")
      .aggregate([
        { $match: { published: true } },
        {
          $group: {
            _id: "$category",
            count: { $sum: 1 },
            image: {
              $first: {
                id: "$id",
                title: "$title",
                width: "$width",
                height: "$height",
              },
            },
          },
        },
        { $sort: { count: -1 } },
        { $limit: 6 },
      ])
      .toArray(),
  ]);
  const hero = featured[0] || latest[0];
  const sections = [
    {
      title: "Featured perspectives",
      description: "A few good places to start.",
      items: featured.length ? featured : latest,
      href: "/explore?featured=1",
    },
    {
      title: "Trending wallpapers",
      description: "Most downloaded by the community.",
      items: trending,
      href: "/trending",
    },
    {
      title: "Latest additions",
      description: "Fresh images for a fresh start.",
      items: latest,
      href: "/latest",
    },
    {
      title: "For your phone",
      description: "Portrait originals, ready to fit your device.",
      items: phones,
      href: "/explore?orientation=portrait",
    },
    {
      title: "For your desktop",
      description: "Room to breathe on a bigger screen.",
      items: desktops,
      href: "/explore?orientation=landscape",
    },
    {
      title: "Football collection",
      description:
        "Stadiums, matchday scenes and approved football photography.",
      items: football,
      href: "/explore?category=Football",
    },
  ];
  return (
    <div className="shell home-page">
      <section className="home-hero">
        <div className="home-hero-copy">
          <p className="eyebrow">A LITTLE INSPIRATION, EVERY DAY</p>
          <h1>
            Your screen.
            <br />
            <span>A better view.</span>
          </h1>
          <p className="home-lede">
            Find something you love. Fit it to your screen. Save the real image,
            ready to make it yours.
          </p>
          <form action="/explore" className="home-search">
            <Search size={21} />
            <input
              aria-label="Search the wallpaper collection"
              name="q"
              placeholder="Mountains, midnight, matchday…"
            />
            <button type="submit">Search</button>
          </form>
          <div className="home-links">
            <Link href="/explore">
              Find your wallpaper <ArrowUpRight size={16} />
            </Link>
            <Link href="/studio">
              <Sparkles size={16} />
              Create your own
            </Link>
          </div>
          <p className="home-count">
            {total.toLocaleString()} wallpapers in the collection · JPG, PNG &
            WebP
          </p>
        </div>
        <div className="home-hero-art">
          {hero ? (
            <Link href={`/wallpaper/${hero.id}`}>
              <img
                src={`/api/wallpapers/${hero.id}/thumbnail`}
                width={hero.width}
                height={hero.height}
                alt={hero.title}
                fetchPriority="high"
              />
              <div className="home-image-credit">
                <span>
                  {hero.title
                    .replace(/\.(jpe?g|png|webp)$/i, "")
                    .replace(/_/g, " ")}
                </span>
                <ArrowUpRight size={18} />
              </div>
            </Link>
          ) : (
            <div className="panel">
              The collection is being prepared. Explore your own photos in the
              Studio.
            </div>
          )}
        </div>
      </section>
      <div className="home-device-links">
        <Link href="/explore?orientation=portrait">
          <Smartphone size={19} />
          <span>
            Phone wallpapers<small>iPhone, Samsung, Pixel & custom sizes</small>
          </span>
          <ArrowUpRight size={17} />
        </Link>
        <Link href="/explore?orientation=landscape">
          <Monitor size={19} />
          <span>
            Desktop wallpapers<small>Full HD, QHD, 4K, 5K & ultrawide</small>
          </span>
          <ArrowUpRight size={17} />
        </Link>
        <Link href="/studio">
          <Sparkles size={19} />
          <span>
            Wallpaper Studio
            <small>Upload, fit and personalize your photo</small>
          </span>
          <ArrowUpRight size={17} />
        </Link>
      </div>
      <section className="home-section">
        <div className="section-heading">
          <div>
            <p className="eyebrow">FIND YOUR MOOD</p>
            <h2>Popular categories</h2>
          </div>
          <Link href="/categories">All categories →</Link>
        </div>
        <div className="home-categories">
          {categories.map((c) => (
            <Link
              key={c._id}
              href={`/explore?category=${encodeURIComponent(c._id)}`}
            >
              <span>{c._id.replace(" and ", " & ")}</span>
              <small>{c.count} wallpapers</small>
              <ArrowUpRight size={16} />
            </Link>
          ))}
        </div>
      </section>
      {sections.map((section, index) => (
        <section className="home-section" key={section.title}>
          <div className="section-heading">
            <div>
              <h2>{section.title}</h2>
              <p className="muted">{section.description}</p>
            </div>
            <Link href={section.href}>View collection →</Link>
          </div>
          {section.items.length ? (
            <div className="wall-grid">
              {section.items.map((w, i) => (
                <WallpaperCard
                  key={w.id}
                  wallpaper={card(w)}
                  eager={index === 0 && i < 2}
                />
              ))}
            </div>
          ) : (
            <div className="collection-empty-small">
              <p>New images are reviewed before joining this collection.</p>
              <Link href={section.href}>Explore the collection →</Link>
            </div>
          )}
        </section>
      ))}
      <section className="home-studio">
        <div>
          <p className="eyebrow">MAKE IT PERSONAL</p>
          <h2>Your photo deserves a place on your screen.</h2>
          <p className="muted">
            Keep the whole image, choose your crop, add a few words, and export
            at the right size.
          </p>
        </div>
        <Link className="save-primary" href="/studio">
          Open Wallpaper Studio <ArrowUpRight size={18} />
        </Link>
      </section>
    </div>
  );
}
