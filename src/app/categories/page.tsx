import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { categories } from "@/lib/constants";
export const metadata = { title: "Wallpaper categories" };
export default function Page() {
  return (
    <div className="shell pt-16">
      <p className="eyebrow">A WORLD OF INSPIRATION</p>
      <h1 className="page-title">Find your kind of beautiful.</h1>
      <p className="muted mb-10">
        Explore a mood, a place, a possibility. Categories grow as reviewed
        images are added.
      </p>
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {categories.map((c, i) => (
          <Link
            key={c}
            href={"/explore?category=" + encodeURIComponent(c)}
            className="panel min-h-44 flex flex-col justify-between hover:border-teal-300/40 transition"
            style={{
              background: `linear-gradient(140deg,hsl(${155 + i * 17} 30% 15%),#10151d)`,
            }}
          >
            <span className="text-xs text-white/30">
              {String(i + 1).padStart(2, "0")}
            </span>
            <h2 className="text-lg flex justify-between items-center mb-0">
              {c}
              <ArrowUpRight size={18} />
            </h2>
          </Link>
        ))}
      </div>
    </div>
  );
}
