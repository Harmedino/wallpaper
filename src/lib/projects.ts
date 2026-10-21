import { database, db } from "./db";
import { optionsSchema } from "./images";
import { randomUUID } from "node:crypto";
export async function saveProject(ownerId: string, input: any) {
  const options = optionsSchema.parse(input.options);
  const existing = input.id
    ? await database
        .collection("projects")
        .findOne({ id: String(input.id), ownerId })
    : null;
  if (input.id && !existing) throw new Error("Draft not found");
  const ids = [
    input.uploadId,
    input.originalUploadId,
    ...options.photoIds,
    options.backgroundPhotoId,
  ].filter(Boolean);
  const uploads = await Promise.all(
    ids.map(async (id) => {
      const upload = await db.upload.findUnique({
        where: { id: String(id), ownerId, expiresAt: { gt: new Date() } },
      });
      if (!upload) throw new Error("A project image is missing or expired");
      return upload;
    }),
  );
  if (
    !existing &&
    (await database
      .collection("projects")
      .countDocuments({ ownerId, expiresAt: { $gt: new Date() } })) >= 20
  )
    throw new Error("Maximum 20 active drafts; delete an older draft first");
  const expiresAt = new Date(Date.now() + 7 * 86400000);
  for (const upload of uploads)
    await db.upload.update({ where: { id: upload.id }, data: { expiresAt } });
  const project = {
    id: existing?.id || randomUUID(),
    ownerId,
    name: String(input.name || "My wallpaper").slice(0, 100),
    uploadId: String(input.uploadId),
    originalUploadId: input.originalUploadId
      ? String(input.originalUploadId)
      : undefined,
    sourceKind: input.sourceKind === "background" ? "background" : "photo",
    cutoutDone: !!input.cutoutDone,
    options,
    createdAt: new Date(),
    updatedAt: new Date(),
    expiresAt,
  };
  if (existing)
    await database
      .collection("projects")
      .updateOne({ id: existing.id, ownerId }, { $set: project });
  else await database.collection("projects").insertOne(project);
  return project;
}
export async function getProject(ownerId: string, id: string) {
  const project = await database
    .collection("projects")
    .findOne(
      { id, ownerId, expiresAt: { $gt: new Date() } },
      { projection: { _id: 0 } },
    );
  if (!project) return null;
  const ids = [
    project.uploadId,
    project.originalUploadId,
    ...project.options.photoIds,
    project.options.backgroundPhotoId,
  ].filter(Boolean);
  const uploads = await db.upload.findMany({
    where: { id: { in: ids }, ownerId, expiresAt: { gt: new Date() } },
    take: 20,
  });
  if (new Set(uploads.map((u) => u.id)).size !== new Set(ids).size)
    throw new Error("One or more draft images expired");
  return {
    ...project,
    uploads: uploads.map((u) => ({
      id: u.id,
      width: u.width,
      height: u.height,
      sourceWallpaperId: u.sourceWallpaperId,
    })),
  };
}
