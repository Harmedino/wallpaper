export function allowedLicense(license: string) {
  return /^(cc0(?:-1\.0)?|pdm(?:-1\.0)?|public-domain|cc-by(?:-sa)?-(?:1\.0|2\.0|2\.5|3\.0|4\.0))$/i.test(
    license.trim(),
  );
}
export function licenseUrl(license: string) {
  const l = license.toLowerCase();
  if (l === "cc0" || l === "cc0-1.0")
    return "https://creativecommons.org/publicdomain/zero/1.0/";
  if (l === "pdm" || l === "pdm-1.0" || l === "public-domain")
    return "https://creativecommons.org/publicdomain/mark/1.0/";
  const v = l.match(/^(cc-by(?:-sa)?)-(\d\.\d)$/);
  return v
    ? `https://creativecommons.org/licenses/${v[1].slice(3)}/${v[2]}/`
    : "";
}
export function attribution(
  w: {
    title: string;
    creator: string;
    license: string;
    licenseUrl: string;
    sourceUrl: string;
  },
  modified = true,
) {
  return `${w.title} — ${w.creator}\nSource: ${w.sourceUrl}\nLicense: ${w.license} ${w.licenseUrl}\n${modified ? "Modified: cropped, resized and/or enhanced." : ""}\n${w.license.toLowerCase().includes("by-sa") ? "Adapted wallpaper is distributed under the same ShareAlike license." : ""}`;
}
