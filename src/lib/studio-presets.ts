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
  { id: "mountains", name: "Alpine escape", a: "#bacfcb", b: "#263c53" },
  { id: "waves", name: "Ocean waves", a: "#a5e1e0", b: "#12475e" },
  { id: "orbit", name: "Lunar orbit", a: "#10132f", b: "#61467d" },
  { id: "botanical", name: "Botanical", a: "#e6e1c7", b: "#789575" },
  { id: "retro", name: "Retro sun", a: "#eed7b2", b: "#ca745b" },
  { id: "blueprint", name: "Blueprint", a: "#142f4a", b: "#246080" },
  { id: "memphis", name: "Playful shapes", a: "#edd4b8", b: "#ce958f" },
  { id: "arches", name: "Desert arches", a: "#e2bb91", b: "#9b5548" },
] as const;
export const textFonts = {
  cinzel: { label: "Cinzel", family: "Cinzel", file: "Cinzel[wght].ttf" },
  comfortaa: {
    label: "Comfortaa",
    family: "Comfortaa",
    file: "Comfortaa[wght].ttf",
  },
  anton: { label: "Anton", family: "Anton", file: "Anton-Regular.ttf" },
  abrilfatface: {
    label: "Abril Fatface",
    family: "Abril Fatface",
    file: "AbrilFatface-Regular.ttf",
  },
  caveat: { label: "Caveat", family: "Caveat", file: "Caveat[wght].ttf" },
  spacegrotesk: {
    label: "Space Grotesk",
    family: "Space Grotesk",
    file: "SpaceGrotesk[wght].ttf",
  },
  playfairdisplay: {
    label: "Playfair Display",
    family: "Playfair Display",
    file: "PlayfairDisplay[wght].ttf",
  },
  oswald: { label: "Oswald", family: "Oswald", file: "Oswald[wght].ttf" },
  dancingscript: {
    label: "Dancing Script",
    family: "Dancing Script",
    file: "DancingScript[wght].ttf",
  },
  bebasneue: {
    label: "Bebas Neue",
    family: "Bebas Neue",
    file: "BebasNeue-Regular.ttf",
  },
  pacifico: {
    label: "Pacifico",
    family: "Pacifico",
    file: "Pacifico-Regular.ttf",
  },
  lobster: { label: "Lobster", family: "Lobster", file: "Lobster-Regular.ttf" },
  monoItalic: {
    label: "Typewriter italic",
    family: "DejaVu Sans Mono Oblique",
    file: "DejaVuSansMono-Oblique.ttf",
  },
  monoBold: {
    label: "Code bold",
    family: "DejaVu Sans Mono Bold",
    file: "DejaVuSansMono-Bold.ttf",
  },
  serifBoldItalic: {
    label: "Magazine italic",
    family: "DejaVu Serif Bold Italic",
    file: "DejaVuSerif-BoldItalic.ttf",
  },
  serifItalic: {
    label: "Literary italic",
    family: "DejaVu Serif Italic",
    file: "DejaVuSerif-Italic.ttf",
  },
  serifBold: {
    label: "Classic bold",
    family: "DejaVu Serif Bold",
    file: "DejaVuSerif-Bold.ttf",
  },
  condensed: {
    label: "Condensed headline",
    family: "DejaVu Sans Condensed Bold",
    file: "DejaVuSansCondensed-Bold.ttf",
  },
  italic: {
    label: "Sans italic",
    family: "DejaVu Sans Oblique",
    file: "DejaVuSans-Oblique.ttf",
  },
  light: {
    label: "Airy light",
    family: "DejaVu Sans ExtraLight",
    file: "DejaVuSans-ExtraLight.ttf",
  },
  bold: {
    label: "Poster bold",
    family: "DejaVu Sans Bold",
    file: "DejaVuSans-Bold.ttf",
  },
  sans: { label: "Modern sans", family: "DejaVu Sans", file: "StudioSans.ttf" },
  serif: {
    label: "Editorial serif",
    family: "DejaVu Serif",
    file: "StudioSerif.ttf",
  },
  mono: {
    label: "Typewriter",
    family: "DejaVu Sans Mono",
    file: "StudioMono.ttf",
  },
};

export const backgroundIds = backgrounds.map((b) => b.id) as [
  string,
  ...string[],
];
