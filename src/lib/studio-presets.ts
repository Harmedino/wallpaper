export const looks = [
  {
    id: "original",
    name: "Original",
    brightness: 1,
    saturation: 1,
    contrast: 1,
    cinematic: false,
  },
  {
    id: "golden",
    name: "Golden hour",
    brightness: 1.08,
    saturation: 1.25,
    contrast: 1.06,
    cinematic: false,
  },
  {
    id: "noir",
    name: "Noir",
    brightness: 1,
    saturation: 0,
    contrast: 1.2,
    cinematic: false,
  },
  {
    id: "pastel",
    name: "Soft pastel",
    brightness: 1.15,
    saturation: 0.7,
    contrast: 0.85,
    cinematic: false,
  },
  {
    id: "vivid",
    name: "Vivid",
    brightness: 1.03,
    saturation: 1.5,
    contrast: 1.15,
    cinematic: false,
  },
  {
    id: "cinema",
    name: "Cinema",
    brightness: 0.95,
    saturation: 0.85,
    contrast: 1.12,
    cinematic: true,
  },
];
export const backgrounds = [
  { id: "aurora", name: "Aurora", a: "#073b46", b: "#7e59bf" },
  { id: "sunset", name: "Sunset", a: "#f8a17a", b: "#4c3674" },
  { id: "midnight", name: "Midnight", a: "#071322", b: "#2d6087" },
  { id: "paper", name: "Warm paper", a: "#ece0c7", b: "#c5a887" },
] as const;
export const textFonts = {
  sans: { label: "Modern sans", family: "Studio Sans", file: "StudioSans.ttf" },
  serif: {
    label: "Editorial serif",
    family: "Studio Serif",
    file: "StudioSerif.ttf",
  },
  mono: { label: "Typewriter", family: "Studio Mono", file: "StudioMono.ttf" },
};
