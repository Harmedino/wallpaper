import { randomBytes, scryptSync } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
let input = "";
for await (const chunk of process.stdin) input += chunk;
const password = input.trim();
if (password.length < 16)
  throw new Error("Supply a password of at least 16 characters on stdin.");
const salt = randomBytes(16).toString("hex"),
  hash = scryptSync(password, salt, 64).toString("hex");
const old = await readFile(".env", "utf8");
const line = `ADMIN_PASSWORD_HASH=${salt}:${hash}`;
await writeFile(
  ".env",
  /^ADMIN_PASSWORD_HASH=.*$/m.test(old)
    ? old.replace(/^ADMIN_PASSWORD_HASH=.*$/m, line)
    : old + "\n" + line + "\n",
  { mode: 0o600 },
);
console.log("Updated administrator password hash in .env. Restart the server.");
