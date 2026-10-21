import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { database } from "@/lib/db";
import { categories } from "@/lib/constants";
import { WallpaperThumbnail } from "@/components/wallpaper-thumbnail";
import { ensureStarterCatalog } from "@/lib/starter-catalog";
export const metadata = { title: "Wallpaper categories" };
export const dynamic = "force-dynamic";
export default async function Page() {
  await ensureStarterCatalog();
  const groups = await database
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
    ])
    .toArray();
  const upcoming = categories.filter((c) => !groups.some((g) => g._id === c));
  return (
    <div className="shell category-page">
      <p className="eyebrow">EXPLORE THE COLLECTION</p>
      <h1 className="page-title">Find your kind of beautiful.</h1>
      <p className="muted">
        A place, a color, a feeling. Every collection starts with a different
        perspective.
      </p>
      <div className="category-grid">
        {groups.map((g) => (
          <Link
            key={g._id}
            href={`/explore?category=${encodeURIComponent(g._id)}`}
            className="category-card"
          >
            <div className="category-image">
              <WallpaperThumbnail
                id={g.image.id}
                title={g.image.title}
                width={g.image.width}
                height={g.image.height}
                eager={false}
              />
            </div>
            <div>
              <h2>{g._id}</h2>
              <p className="muted">{g.count} wallpapers</p>
              <ArrowUpRight size={20} />
            </div>
          </Link>
        ))}
      </div>
      {upcoming.length > 0 && (
        <details className="detail-provenance">
          <summary>Collections still growing</summary>
          <div className="flex flex-wrap gap-2 mt-5">
            {upcoming.map((c) => (
              <Link
                className="chip"
                key={c}
                href={`/explore?category=${encodeURIComponent(c)}`}
              >
                {c}
              </Link>
            ))}
          </div>
        </details>
      )}
    </div>
  );
}
