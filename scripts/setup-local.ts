import { randomBytes, scryptSync } from "node:crypto";
import { readFile, writeFile, mkdir } from "node:fs/promises";
await mkdir(".data", { recursive: true });
let existing = "";
try {
  existing = await readFile(".env", "utf8");
} catch (e) {
  if ((e as NodeJS.ErrnoException).code !== "ENOENT") throw e;
}
if (!existing) {
  const password = randomBytes(18).toString("base64url"),
    salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, 64).toString("hex");
  await writeFile(
    ".env",
    `MONGODB_URI=mongodb://127.0.0.1:27017/wallpaper\nAPP_URL=http://localhost:3000\nSESSION_SECRET=${randomBytes(32).toString("hex")}\nADMIN_PASSWORD_HASH=${salt}:${hash}\nSTORAGE_PROVIDER=local\nAI_PROVIDER=none\n`,
    { mode: 0o600, flag: "wx" },
  );
  await writeFile(".data/admin-password.txt", password + "\n", {
    mode: 0o600,
    flag: "wx",
  });
  console.log(
    "Created private local .env and .data/admin-password.txt. No credentials printed.",
  );
} else console.log("Preserving existing .env.");
