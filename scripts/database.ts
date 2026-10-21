import { MongoMemoryServer } from "mongodb-memory-server";
import fs from "node:fs/promises";
await fs.mkdir(".data/mongo", { recursive: true });
const server = await MongoMemoryServer.create({
  instance: {
    port: 27017,
    ip: "127.0.0.1",
    dbPath: ".data/mongo",
    storageEngine: "wiredTiger",
  },
  binary: { version: "8.0.17", downloadDir: ".data/mongodb-binaries" },
});
console.log("Persistent local MongoDB listening on 127.0.0.1:27017");
for (const signal of ["SIGTERM", "SIGINT"])
  process.on(signal, async () => {
    await server.stop({ doCleanup: false });
    process.exit(0);
  });
setInterval(() => {}, 60000);
