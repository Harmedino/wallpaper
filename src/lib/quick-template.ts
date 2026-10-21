import { textFonts } from "./studio-presets";
export type QuickTemplate = {
  font?: string;
  fontStyle?: string;
  align?: string;
  textBlur?: number;
  textScale?: number;
  spacing?: number;
  opacity?: number;
  style: string;
  primary: string;
  secondary: string;
  accent: string;
  name: string;
  badge: string;
  number: string;
  width: number;
  height: number;
};
const escape = (s: string) =>
  s.replace(
    /[&<>"']/g,
    (c) =>
      ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&apos;",
      })[c]!,
  );
export function quickTemplateSvg(o: QuickTemplate) {
  const { width: w, height: h } = o,
    cx = w * 0.5,
    cy = h * 0.59,
    r = Math.min(w * 0.29, h * 0.2),
    unit = w / 8;
  const stripes = Array.from(
    { length: 8 },
    (_, i) =>
      `<rect x="${i * unit}" width="${unit}" height="${h}" fill="${i % 2 ? o.secondary : o.primary}"/>`,
  ).join("");
  const rays = Array.from(
    { length: 18 },
    (_, i) =>
      `<path d="M${cx} ${cy}L${cx + Math.cos((i * Math.PI) / 9) * h * 2} ${cy + Math.sin((i * Math.PI) / 9) * h * 2}" stroke="${o.primary}" stroke-width="${w * 0.06}" opacity=".45"/>`,
  ).join("");
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}"><style>text{opacity:${o.opacity ?? 1};font-style:${o.fontStyle?.includes("italic") ? "italic" : "normal"};font-weight:${o.fontStyle?.includes("bold") ? 700 : 400};filter:url(#textBlur);}</style><defs><filter id="textBlur" x="-30%" y="-100%" width="160%" height="300%"><feGaussianBlur stdDeviation="${((o.textBlur ?? 0) * w) / 1440}"/></filter><pattern id="weave" width="24" height="24" patternUnits="userSpaceOnUse"><path d="M0 24L24 0" stroke="white" stroke-opacity=".05"/></pattern><radialGradient id="light"><stop stop-color="white" stop-opacity=".12"/><stop offset="1" stop-color="white" stop-opacity="0"/></radialGradient></defs><rect width="100%" height="100%" fill="${o.secondary}"/>${o.style === "rays" ? rays : o.style === "minimal" ? "" : stripes}<rect width="100%" height="100%" fill="url(#weave)"/><ellipse cx="${cx}" cy="${h * 0.35}" rx="${w}" ry="${h * 0.7}" fill="url(#light)"/><g fill="${o.accent}" font-family="${escape(textFonts[o.font as keyof typeof textFonts]?.family || "DejaVu Sans")}, sans-serif" text-anchor="middle"><text x="${cx}" y="${cy - r * 1.32}" font-size="${r * 0.38}" letter-spacing="${r * 0.12}">★ ★</text><circle cx="${cx}" cy="${cy}" r="${r}" fill="${o.secondary}" stroke="${o.accent}" stroke-width="${r * 0.07}"/><circle cx="${cx}" cy="${cy}" r="${r * 0.86}" fill="none" stroke="${o.accent}" stroke-width="${r * 0.012}"/><text x="${cx}" y="${cy + r * 0.17}" font-size="${Math.min(r * 0.7, (r * 1.55) / Math.max(1, o.badge.length))}" font-weight="bold">${escape(o.badge.slice(0, 3))}</text><text text-anchor="${o.align === "left" ? "start" : o.align === "right" ? "end" : "middle"}" x="${o.align === "left" ? w * 0.08 : o.align === "right" ? w * 0.92 : cx}" y="${h * 0.84}" font-size="${Math.min(Math.min(w * 0.07, h * 0.075) * (o.textScale ?? 1), (w * 0.84) / Math.max(1, o.name.length))}" font-weight="bold" letter-spacing="${w * (o.spacing ?? 0.008)}">${escape(o.name.toUpperCase())}</text><text x="${cx}" y="${h * 0.9}" font-size="${Math.min(w * 0.035, h * 0.04)}" letter-spacing="${w * 0.02}">${escape(o.number ? "NO. " + o.number : "FOREVER A FAN")}</text></g></svg>`;
}
