export const devices = [
  {
    id: "iphone",
    group: "phone",
    name: "iPhone 16 Pro",
    width: 1206,
    height: 2622,
    os: "ios",
  },
  {
    id: "iphone-max",
    group: "phone",
    name: "iPhone 16 Pro Max",
    width: 1320,
    height: 2868,
    os: "ios",
  },
  {
    id: "pixel",
    group: "phone",
    name: "Google Pixel 9 Pro",
    width: 1280,
    height: 2856,
    os: "android",
  },
  {
    id: "android",
    group: "phone",
    name: "Samsung Galaxy S25 Ultra · One UI 7",
    width: 1440,
    height: 3120,
    os: "android",
  },
  {
    id: "windows",
    group: "desktop",
    name: "Windows · 4K monitor",
    width: 3840,
    height: 2160,
    os: "windows",
  },
  {
    id: "mac",
    group: "desktop",
    name: "MacBook Pro 14",
    width: 3024,
    height: 1964,
    os: "mac",
  },
  {
    id: "ultrawide",
    group: "desktop",
    name: "Windows · Ultrawide",
    width: 3440,
    height: 1440,
    os: "windows",
  },
  {
    id: "ipad",
    group: "ipad",
    name: "iPad Pro 12.9",
    width: 2732,
    height: 2048,
    os: "ios",
  },
];

export function compatibleDevices(image: { width: number; height: number }) {
  if (!(image.width > 0 && image.height > 0)) return [];
  const ratio = image.width / image.height;
  // Allow only subpixel/metadata rounding, never an orientation-only match.
  return devices.filter(
    (device) =>
      Math.abs(Math.log(ratio / (device.width / device.height))) <= 0.003,
  );
}
