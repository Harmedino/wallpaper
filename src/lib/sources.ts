import { db } from "./db";
import { remoteJson, permittedUrl } from "./network";
import { allowedLicense, licenseUrl } from "./licenses";
const plain = (s: string = "") => s.replace(/<[^>]*>/g, "").slice(0, 1000);
async function runDiscovery(id: string, query: string) {
  let rows: any[] = [];
  const q = encodeURIComponent(query);
  if (id === "openverse") {
    const data = await remoteJson(
      `https://api.openverse.org/v1/images/?q=${q}&license_type=commercial,modification&page_size=20`,
    );
    rows = (data.results || []).map((r: any) => ({
      externalId: `openverse:${r.id}`,
      title: r.title,
      imageUrl: r.url,
      sourceUrl: r.foreign_landing_url,
      creator: r.creator || "Unknown",
      license: ["cc0", "pdm"].includes(r.license)
        ? r.license
        : `${r.license}-${r.license_version}`,
      width: r.width || 0,
      height: r.height || 0,
      metadata: { attribution: r.attribution, provider: r.provider },
    }));
  } else if (id === "commons") {
    const data = await remoteJson(
      `https://commons.wikimedia.org/w/api.php?action=query&format=json&generator=search&gsrsearch=${q}&gsrnamespace=6&gsrlimit=20&prop=imageinfo&iiprop=url%7Csize%7Cextmetadata`,
    );
    rows = Object.values(data.query?.pages || {}).flatMap((p: any) => {
      const r = p.imageinfo?.[0];
      if (!r) return [];
      const e = r.extmetadata || {};
      const license = plain(e.LicenseShortName?.value)
        .toLowerCase()
        .replace(/ /g, "-");
      return [
        {
          externalId: `commons:${p.pageid}`,
          title: plain(p.title.replace(/^File:/, "")),
          imageUrl: r.url,
          sourceUrl: r.descriptionurl,
          creator: plain(e.Artist?.value) || "Unknown",
          license,
          width: r.width,
          height: r.height,
          metadata: {
            restrictions: plain(e.Restrictions?.value),
            license: plain(e.License?.value),
            credit: plain(e.Credit?.value),
          },
        },
      ];
    });
  } else if (id === "nasa") {
    const data = await remoteJson(
      `https://images-api.nasa.gov/search?q=${q}&media_type=image&page_size=20`,
    );
    for (const item of (data.collection?.items || []).slice(0, 10)) {
      const r = item.data?.[0];
      if (!r?.nasa_id) continue;
      const asset = await remoteJson(
        `https://images-api.nasa.gov/asset/${encodeURIComponent(r.nasa_id)}`,
      );
      const link = asset.collection?.items?.find((x: any) =>
        /orig\.(jpg|png|jpeg)$/i.test(x.href),
      );
      if (!link) continue;
      rows.push({
        externalId: `nasa:${r.nasa_id}`,
        title: r.title,
        imageUrl: link.href.replace(
          /^http:\/\/images-assets\.nasa\.gov\//,
          "https://images-assets.nasa.gov/",
        ),
        sourceUrl: `https://images.nasa.gov/details/${encodeURIComponent(r.nasa_id)}`,
        creator: r.photographer || r.center || "NASA",
        license: "public-domain",
        width: 0,
        height: 0,
        metadata: {
          description: plain(r.description),
          requiresNasaRightsReview: true,
          credit: r.secondary_creator || "",
        },
      });
    }
  } else throw new Error("Unknown provider");
  let added = 0;
  for (const r of rows) {
    if (!allowedLicense(r.license) || r.creator === "Unknown") continue;
    if (
      id !== "nasa" &&
      (Math.max(r.width, r.height) < 1920 || Math.min(r.width, r.height) < 1080)
    )
      continue;
    try {
      permittedUrl(r.imageUrl);
    } catch {
      continue;
    }
    if (await db.candidate.findUnique({ where: { externalId: r.externalId } }))
      continue;
    await db.candidate.upsert({
      where: { externalId: r.externalId },
      create: {
        ...r,
        sourceId: id,
        status: "pending",
        licenseUrl: licenseUrl(r.license),
      },
      update: {},
    });
    added++;
  }
  await db.source.update({
    where: { id },
    data: { lastRunAt: new Date(), lastError: null },
  });
  return added;
}

export async function discover(id: string, query: string) {
  try {
    return await runDiscovery(id, query);
  } catch (e) {
    const message = e instanceof Error ? e.message : "Source discovery failed";
    await db.source
      .update({
        where: { id },
        data: { lastRunAt: new Date(), lastError: message },
      })
      .catch(() => {});
    throw new Error(`${id} discovery failed: ${message}`);
  }
}
