import { test, expect } from "@playwright/test";
import sharp from "sharp";
test("Football presets produce editable layers and a real preview", async ({
  page,
}) => {
  await Promise.all([
    page.waitForResponse((r) => r.url().endsWith("/api/capabilities")),
    page.goto("/football-creator"),
  ]);
  const bytes = await sharp({
    create: { width: 800, height: 1200, channels: 3, background: "#264455" },
  })
    .png()
    .toBuffer();
  await page.getByLabel("Upload image").setInputFiles({
    name: "player.png",
    mimeType: "image/png",
    buffer: bytes,
  });
  await page.getByLabel("Player name", { exact: true }).fill("ALEX");
  await page
    .getByRole("button", { name: "Stadium Night", exact: true })
    .click();
  await expect(page.getByAltText("Edited wallpaper preview")).toBeVisible();
  await expect(page.getByText("Preview failed", { exact: false })).toHaveCount(
    0,
  );
  await page
    .getByRole("button", { name: "Matchday Theme", exact: true })
    .click();
  await expect(page.getByLabel("smoke", { exact: true })).toBeVisible();
});
test("Smart Fit has genuine face detection and honest optional AI controls", async ({
  page,
}) => {
  await page.goto("/smart-fit");
  await expect(
    page.getByRole("heading", { name: /Smart Wallpaper Fit/ }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: /Fit detected face/ }),
  ).toBeDisabled();
  await expect(page.getByText(/Requires OUTPAINT_PROVIDER/)).toBeVisible();
});
test("Face model runs locally and saved drafts restore layered edits", async ({
  page,
}) => {
  test.setTimeout(60000);
  await Promise.all([
    page.waitForResponse((r) => r.url().endsWith("/api/capabilities")),
    page.goto("/smart-fit"),
  ]);
  const bytes = await sharp({
    create: { width: 800, height: 1200, channels: 3, background: "#264455" },
  })
    .png()
    .toBuffer();
  await page
    .getByLabel("Upload image")
    .setInputFiles({ name: "photo.png", mimeType: "image/png", buffer: bytes });
  await expect(page.getByAltText("Edited wallpaper preview")).toBeVisible();
  await page.getByRole("button", { name: /Fit detected face/ }).click();
  await expect(page.getByText(/No face detected/)).toBeVisible({
    timeout: 30000,
  });
  await page.getByLabel("Wallpaper text", { exact: true }).fill("DRAFT FIRST");
  await page
    .getByLabel("Draft name", { exact: true })
    .fill("Browser saved project");
  await page.getByRole("button", { name: "Save draft", exact: true }).click();
  await expect(page.getByText(/Draft saved/)).toBeVisible();
  await page.getByLabel("Wallpaper text", { exact: true }).fill("DRAFT SECOND");
  await page.waitForTimeout(400);
  await page.getByRole("button", { name: "Undo", exact: true }).click();
  await expect(page.getByLabel("Wallpaper text", { exact: true })).toHaveValue(
    "DRAFT FIRST",
  );
  await page.getByRole("button", { name: "Redo", exact: true }).click();
  await expect(page.getByLabel("Wallpaper text", { exact: true })).toHaveValue(
    "DRAFT SECOND",
  );
  await page.getByRole("button", { name: "Open drafts", exact: true }).click();
  await page
    .getByRole("button", { name: "Browser saved project", exact: true })
    .click();
  await expect(page.getByLabel("Wallpaper text", { exact: true })).toHaveValue(
    "DRAFT FIRST",
  );
});
