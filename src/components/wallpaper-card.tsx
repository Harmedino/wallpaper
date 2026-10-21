"use client";
import { useState } from "react";
import Link from "next/link";
import { WallpaperThumbnail } from "./wallpaper-thumbnail";
import { PhonePreview } from "./phone-preview";
import { compatibleDevices } from "@/lib/device-fit";
import { qualityLabel } from "@/lib/wallpaper-fit";
import { ArrowUpRight, Smartphone, Monitor } from "lucide-react";
export type WallpaperCardData = {
  id: string;
  title: string;
  width: number;
  height: number;
  category: string;
  verifiedAt?: string | Date | null;
  aiStatus?: string;
  downloads?: number;
  color?: string;
};
export function WallpaperCard({
  wallpaper: w,
  eager = false,
}: {
  wallpaper: WallpaperCardData;
  eager?: boolean;
}) {
  const [preview, setPreview] = useState(false);
  const fitting = compatibleDevices(w);
  const first = fitting.find((d) => d.id === "android") || fitting[0];
  const title = w.title.replace(/\.(jpe?g|png|webp)$/i, "").replace(/_/g, " ");
  return (
    <article className="wall-card">
      <Link href={`/wallpaper/${w.id}`} className="block wall-card-link">
        <div
          className="wall-visual"
          style={{ aspectRatio: w.width / w.height }}
        >
          <WallpaperThumbnail
            id={w.id}
            title={title}
            eager={eager}
            width={w.width}
            height={w.height}
          />
          <span className="wall-quality">
            {w.width >= w.height ? "Landscape" : "Portrait"}
          </span>
          <span className="wall-open">
            <ArrowUpRight size={18} />
          </span>
        </div>
        <div className="wall-caption">
          <div>
            <h3>{title}</h3>
            <p>
              {w.width} × {w.height}
              <span> · </span>
              {qualityLabel(w)}
            </p>
          </div>
        </div>
      </Link>
      {first && (
        <button className="wall-phone-preview" onClick={() => setPreview(true)}>
          {first.group === "phone" ? (
            <Smartphone size={14} />
          ) : (
            <Monitor size={14} />
          )}
          Preview on{" "}
          {first.group === "phone"
            ? "phone"
            : first.group === "ipad"
              ? "iPad"
              : "desktop"}
        </button>
      )}
      {preview && (
        <PhonePreview
          wallpaper={w}
          initialDevice={first.id}
          onClose={() => setPreview(false)}
        />
      )}
    </article>
  );
}
