import { backgrounds } from "./studio-presets";
/** Original vector scenes shared by background thumbnails and exported artwork. */
export function backgroundSvg(id: string, width = 1600, height = 1000) {
  const p = backgrounds.find((b) => b.id === id);
  if (!p) throw new Error("Unknown background");
  const stars = Array.from(
    { length: 65 },
    (_, i) =>
      `<circle cx="${(i * 173 + 31) % 1000}" cy="${(i * 97 + 13) % 620}" r="${(i % 3) + 1}" fill="white" opacity=".65"/>`,
  ).join("");
  const art: Record<string, string> = {
    mountains:
      '<circle cx="760" cy="170" r="85" fill="#fbe8b5"/><path d="M0 600L200 230 410 510 640 130 1000 650V700H0" fill="#78979a"/><path d="M0 700L270 350 510 660 790 310 1000 590V700" fill="#304c60"/><path d="M560 260L640 130 737 270 640 230Z" fill="#eeeade"/>',
    waves: Array.from(
      { length: 6 },
      (_, i) =>
        `<path d="M0 ${220 + i * 70}Q250 ${80 + i * 70} 500 ${240 + i * 70}T1000 ${220 + i * 70}V700H0" fill="${["#a3d8d5", "#74c3c6", "#51a5b5", "#347f9a", "#205c79", "#164458"][i]}"/>`,
    ).join(""),
    orbit:
      stars +
      '<circle cx="700" cy="230" r="130" fill="#e5d9ca"/><circle cx="655" cy="200" r="24" fill="#b9adb6"/><circle cx="740" cy="280" r="37" fill="#c7bbc2"/><ellipse cx="700" cy="230" rx="250" ry="38" fill="none" stroke="#d4a9dc" stroke-width="7" transform="rotate(-25 700 230)"/>',
    botanical: Array.from(
      { length: 16 },
      (_, i) =>
        `<ellipse cx="${i % 2 ? 850 : 130}" cy="${i * 55}" rx="48" ry="115" fill="${i % 2 ? "#557658" : "#87966c"}" transform="rotate(${i % 2 ? -45 : 45} ${i % 2 ? 850 : 130} ${i * 55})" opacity=".75"/>`,
    ).join(""),
    retro:
      '<circle cx="500" cy="290" r="190" fill="#d47a53"/>' +
      Array.from(
        { length: 9 },
        (_, i) =>
          `<rect x="300" y="${290 + i * 24}" width="400" height="${i + 3}" fill="#e7c6a0"/>`,
      ).join("") +
      '<path d="M0 560Q300 430 600 570T1000 520V700H0" fill="#7b7770"/><path d="M0 630Q400 500 1000 640V700H0" fill="#454f53"/>',
    blueprint:
      '<defs><pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse"><path d="M40 0H0V40" fill="none" stroke="#b4dfeb" stroke-opacity=".25"/></pattern></defs><rect width="1000" height="700" fill="url(#grid)"/><circle cx="500" cy="350" r="220" stroke="#b4dfeb" stroke-width="2" fill="none"/><path d="M200 350H800M500 50V650" stroke="#b4dfeb" stroke-dasharray="10 12"/>',
    memphis:
      '<circle cx="130" cy="150" r="90" fill="#587e98"/><path d="M700 80L920 320H660Z" fill="#dca34a"/><path d="M80 580q80-180 160 0t160 0" fill="none" stroke="#47775e" stroke-width="28"/><rect x="650" y="430" width="230" height="120" rx="60" fill="#b36978" transform="rotate(-25 760 490)"/>',
    arches:
      '<path d="M120 700V320A220 220 0 0 1 560 320V700" fill="#ba7a5f"/><path d="M200 700V320A140 140 0 0 1 480 320V700" fill="#e7c8a4"/><circle cx="790" cy="200" r="90" fill="#f4dfb0"/><path d="M0 620Q500 430 1000 600V700H0" fill="#8f655b"/>',
    aurora:
      '<path d="M-100 620Q250-150 570 300T1100 100" fill="none" stroke="#80efcf" stroke-width="100" opacity=".2"/><path d="M-100 520Q250-180 570 200T1100 0" fill="none" stroke="#cd9df6" stroke-width="60" opacity=".3"/>',
    sunset:
      '<circle cx="650" cy="290" r="160" fill="#ffceaa" opacity=".6"/><path d="M0 520Q250 400 500 550T1000 500V700H0" fill="#493c6b" opacity=".6"/>',
    midnight:
      stars +
      '<path d="M0 700L250 400 430 600 720 320 1000 700" fill="#091c2b"/>',
    paper:
      '<path d="M0 80L1000 40M0 180L1000 140M0 280L1000 240M0 380L1000 340M0 480L1000 440M0 580L1000 540" stroke="#735738" stroke-opacity=".12" stroke-width="2"/>',
  };
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 1000 700" preserveAspectRatio="xMidYMid slice"><defs><linearGradient id="g" x2="1" y2="1"><stop stop-color="${p.a}"/><stop offset="1" stop-color="${p.b}"/></linearGradient></defs><rect width="1000" height="700" fill="url(#g)"/>${art[id] || ""}</svg>`;
}
