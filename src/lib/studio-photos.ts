import { db } from "./db";
import { get } from "./storage";
export async function studioPhotos(ids: string[], ownerId: string) {
  return Promise.all(
    ids.map(async (id) => {
      const upload = await db.upload.findUnique({
        where: { id, ownerId, expiresAt: { gt: new Date() } },
      });
      if (!upload) throw new Error("Collage photo not found or expired");
      return get(upload.key);
    }),
  );
}
