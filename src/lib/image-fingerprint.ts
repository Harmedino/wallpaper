import sharp from "sharp";
export async function perceptualHash(bytes: Buffer) {
  const pixels = await sharp(bytes)
    .resize(9, 8, { fit: "fill" })
    .greyscale()
    .raw()
    .toBuffer();
  let bits = 0n;
  for (let y = 0; y < 8; y++)
    for (let x = 0; x < 8; x++)
      bits =
        (bits << 1n) |
        BigInt(pixels[y * 9 + x] > pixels[y * 9 + x + 1] ? 1 : 0);
  return bits.toString(16).padStart(16, "0");
}
export function hamming(a: string, b: string) {
  let value = BigInt("0x" + a) ^ BigInt("0x" + b),
    count = 0;
  while (value) {
    value &= value - 1n;
    count++;
  }
  return count;
}
