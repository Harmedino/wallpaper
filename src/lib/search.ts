export function gallerySearch(q: string) {
  const lower = q.toLowerCase();
  const words = lower
    .replace(/[^\p{L}\p{N}\s-]/gu, " ")
    .split(/\s+/)
    .filter(Boolean);
  const generic = new Set([
    "wallpaper",
    "wallpapers",
    "background",
    "backgrounds",
    "4k",
    "8k",
    "hd",
    "uhd",
    "iphone",
    "android",
    "phone",
    "desktop",
    "lock",
    "screen",
    "lockscreen",
  ]);
  const colors = ["black", "white", "blue", "green", "red", "purple", "orange"];
  const color = words.find((w) => colors.includes(w));
  const terms = words.filter((w) => !generic.has(w) && w !== color).slice(0, 8);
  return {
    terms,
    color,
    portrait: words.some((w) =>
      ["phone", "iphone", "android", "lockscreen"].includes(w),
    ),
    native4k: words.includes("4k"),
  };
}
export function semanticFilter(terms: string[]) {
  return terms.map((term) => {
    const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    return {
      $or: [
        { title: { $regex: escaped, $options: "i" } },
        { tags: { $regex: escaped, $options: "i" } },
        { category: { $regex: escaped, $options: "i" } },
      ],
    };
  });
}
