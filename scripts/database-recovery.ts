import assert from "node:assert/strict";
import net from "node:net";
// Regression test: the initial connection fails, then the database becomes reachable.
// Requires the local development MongoDB on port 27017.
const sockets = new Set<net.Socket>();
const forwarder = net.createServer((socket) => {
  const upstream = net.connect(27017, "127.0.0.1");
  sockets.add(socket);
  sockets.add(upstream);
  socket.pipe(upstream).pipe(socket);
  for (const s of [socket, upstream]) {
    s.on("error", () => {
      socket.destroy();
      upstream.destroy();
    });
    s.on("close", () => sockets.delete(s));
  }
});
await new Promise<void>((resolve) => forwarder.listen(0, "127.0.0.1", resolve));
const port = (forwarder.address() as net.AddressInfo).port;
await new Promise<void>((resolve, reject) =>
  forwarder.close((e) => (e ? reject(e) : resolve())),
);
process.env.MONGODB_URI = `mongodb://127.0.0.1:${port}/wallpaper?directConnection=true`;
const { db, mongo } = await import("../src/lib/db");
try {
  await assert.rejects(db.wallpaper.count());
  await new Promise<void>((resolve) =>
    forwarder.listen(port, "127.0.0.1", resolve),
  );
  assert.ok((await db.wallpaper.count()) > 0);
  console.log(
    "PASS: a failed initial database connection recovers on the next request without restarting the app.",
  );
} finally {
  await mongo.close();
  for (const socket of sockets) socket.destroy();
  await new Promise<void>((resolve) => forwarder.close(() => resolve()));
}
