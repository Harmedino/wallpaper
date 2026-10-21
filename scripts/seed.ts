import "dotenv/config";
import { nextWeeklyRun } from "../src/lib/scheduling";
import sharp from "sharp";
import { db, ensureIndexes, mongo } from "../src/lib/db";
import { validateImage } from "../src/lib/images";
import { put } from "../src/lib/storage";
await ensureIndexes();
const palettes = [
  ["Aurora silk", "#081c38", "#14e0bb", "#7349db", "Abstract", "green"],
  ["Solar dunes", "#261a3e", "#ffb573", "#e75d57", "Abstract", "orange"],
  [
    "Midnight tides",
    "#041a2e",
    "#2471ab",
    "#7bcee4",
    "Dark and AMOLED",
    "blue",
  ],
  ["Violet reverie", "#1e1237", "#a368d9", "#dfb0db", "Abstract", "purple"],
  ["Emerald horizon", "#071c1a", "#23867a", "#b3cd8a", "Minimalist", "green"],
  ["Crimson orbit", "#180e22", "#df3f64", "#f9b180", "Abstract", "red"],
  ["Blue hour", "#09192b", "#4a6c9b", "#93c4cc", "Minimalist", "blue"],
  ["Golden silence", "#251f1a", "#a1814c", "#e6d2a3", "Minimalist", "orange"],
  ["Lunar drift", "#070b17", "#454d73", "#bebfda", "Dark and AMOLED", "purple"],
];
for (let i = 0; i < palettes.length; i++) {
  const [title, bg, a, b, category, color] = palettes[i];
  const paths = Array.from(
    { length: 12 },
    (_, n) =>
      `<path d="M -100 ${100 + n * 95} C ${800 + i * 30} ${-500 + n * 140}, ${1200 + i * 65} ${1800 - n * 100}, 4200 ${300 + n * 160}" fill="none" stroke="url(#g)" stroke-width="${60 + n * 5}" opacity="${0.1 + n * 0.045}"/>`,
  ).join("");
  const svg = `<svg width="3840" height="2160" xmlns="http://www.w3.org/2000/svg"><defs><linearGradient id="g" x2="1" y2="1"><stop stop-color="${a}"/><stop offset="1" stop-color="${b}"/></linearGradient><radialGradient id="r"><stop stop-color="${a}" stop-opacity=".35"/><stop offset="1" stop-color="${bg}" stop-opacity="0"/></radialGradient></defs><rect width="3840" height="2160" fill="${bg}"/><ellipse cx="2700" cy="600" rx="1700" ry="1400" fill="url(#r)"/>${paths}</svg>`;
  const clean = await validateImage(
    await sharp(Buffer.from(svg)).png().toBuffer(),
  );
  const key = `originals/${clean.hash}.webp`,
    thumb = `thumbs/${clean.hash}.webp`;
  await put(key, clean.bytes);
  await put(
    thumb,
    await sharp(clean.bytes).resize(1100).webp({ quality: 85 }).toBuffer(),
  );
  await db.wallpaper.upsert({
    where: { hash: clean.hash },
    create: {
      title,
      category,
      tags: ["abstract", "4k", color, "original", "desktop"],
      color,
      width: 3840,
      height: 2160,
      hash: clean.hash,
      originalKey: key,
      thumbKey: thumb,
      creator: "Wallspace procedural art collection",
      license: "cc0",
      licenseUrl: "https://creativecommons.org/publicdomain/zero/1.0/",
      sourceUrl: "https://creativecommons.org/publicdomain/zero/1.0/",
      source: "original procedural artwork",
      aiStatus: "original — procedural artwork",
      published: true,
      featured: i < 3,
      downloads: 0,
    },
    update: {},
  });
}
for (const id of ["openverse", "commons", "nasa"])
  await db.source.upsert({
    where: { id },
    create: {
      id,
      enabled: id !== "openverse",
      schedule: "weekly",
      nextRunAt: nextWeeklyRun(),
      query: id === "nasa" ? "nebula" : "landscape",
      intervalHours: 168,
    },
    update: {},
  });
console.log(
  "Seeded 9 original CC0 artworks; Commons/NASA use the weekly schedule; Openverse is opt-in.",
);
await mongo.close();
