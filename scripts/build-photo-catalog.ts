import "dotenv/config";
import { readFile, writeFile } from "node:fs/promises";
import { remoteJson } from "../src/lib/network";
import { canAutoPublish } from "../src/lib/publication";
const subjects: Record<string, string[]> = {
  "Nature and landscapes": [
    "landscape",
    "waterfall",
    "lake",
    "river",
    "autumn landscape",
    "countryside",
    "sunrise landscape",
    "national park",
  ],
  "Mountains and forests": [
    "mountain",
    "forest",
    "alpine lake",
    "snow mountain",
    "pine forest",
    "mountain valley",
    "Himalayas",
    "Alps",
  ],
  "Ocean and beaches": [
    "ocean",
    "beach",
    "coast",
    "sea sunset",
    "tropical island",
    "seascape",
    "rocky coast",
    "waves",
  ],
  "Cities and skylines": [
    "city skyline",
    "city night",
    "New York skyline",
    "Tokyo skyline",
    "London skyline",
    "Singapore skyline",
    "Dubai skyline",
  ],
  Architecture: [
    "architecture building",
    "modern architecture",
    "bridge night",
    "castle",
    "cathedral",
    "historic architecture",
  ],
  Animals: [
    "wildlife animal",
    "tiger",
    "lion",
    "elephant",
    "fox",
    "eagle",
    "deer",
    "bird nature",
  ],
  "Space and galaxies": [
    "Milky Way landscape",
    "night sky stars",
    "star trails",
    "moon landscape",
  ],
  Flowers: [
    "flower macro",
    "botanical flower",
    "cherry blossom",
    "lavender field",
  ],
};
const rows = new Map<string, any>();
for (let round = 0; round < 8 && rows.size < 500; round++)
  for (const [category, queries] of Object.entries(subjects)) {
    if (!queries[round] || rows.size >= 500) continue;
    try {
      const q = encodeURIComponent(queries[round]);
      const data = await remoteJson(
        `https://commons.wikimedia.org/w/api.php?action=query&format=json&generator=search&gsrsearch=${q}&gsrnamespace=6&gsrlimit=50&prop=imageinfo&iiprop=url%7Csize%7Cextmetadata&iiurlwidth=1200`,
      );
      for (const p of Object.values(data.query?.pages || {}) as any[]) {
        const r = p.imageinfo?.[0];
        if (!r) continue;
        const e = r.extmetadata || {};
        const plain = (s = "") => s.replace(/<[^>]*>/g, "").slice(0, 1000);
        const c = {
          externalId: `commons:${p.pageid}`,
          sourceId: "commons",
          title: plain(p.title.replace(/^File:/, "")),
          imageUrl: r.url,
          thumbnailUrl: r.url,
          sourceUrl: r.descriptionurl,
          creator: plain(e.Artist?.value) || "Unknown",
          license: plain(e.LicenseShortName?.value)
            .toLowerCase()
            .replace(/ /g, "-"),
          width: r.width,
          height: r.height,
          metadata: {
            restrictions: plain(e.Restrictions?.value),
            credit: plain(e.Credit?.value),
          },
        };
        if (
          r.size > 20 * 1024 * 1024 ||
          !/\.(jpe?g|png|webp)$/i.test(new URL(c.imageUrl).pathname) ||
          !c.thumbnailUrl ||
          Math.max(c.width, c.height) < 1920 ||
          Math.min(c.width, c.height) < 1080 ||
          !canAutoPublish(c)
        )
          continue;
        rows.set(c.externalId, {
          ...c,
          category: category === "Flowers" ? "Nature and landscapes" : category,
        });
        if (rows.size >= 500) break;
      }
      console.log(queries[round], rows.size);
      await writeFile(
        "/tmp/verified-photo-progress.json",
        JSON.stringify([...rows.values()]),
      );
      await new Promise((r) => setTimeout(r, 2500));
    } catch (e) {
      console.log(
        "Subject unavailable:",
        queries[round],
        e instanceof Error ? e.message : "error",
      );
      await new Promise((r) => setTimeout(r, 30000));
    }
  }
if (rows.size < 500)
  throw new Error(
    `Only ${rows.size} verified entries; add subjects before publishing catalog`,
  );
await writeFile(
  "src/lib/photo-catalog.json",
  JSON.stringify([...rows.values()], null, 2) + "\n",
);
console.log(
  `Saved ${rows.size} real Commons photographs with attribution and reusable licenses.`,
);
