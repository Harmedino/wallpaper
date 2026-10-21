import { test, expect } from "@playwright/test";
import sharp from "sharp";
test("Football presets produce editable layers and a real preview", async ({
  page,
}) => {
  await Promise.all([
    page.waitForResponse((r) => r.url().endsWith("/api/capabilities")),
    page.goto("/football-creator?advanced=1"),
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
  await page.goto("/smart-fit?advanced=1");
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
    page.goto("/smart-fit?advanced=1"),
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

test("simple creator customizes a striped badge and downloads the actual wallpaper", async ({
  page,
}) => {
  await page.goto("/football-creator");
  await expect(
    page.getByRole("heading", { name: "Your club. Your screen." }),
  ).toBeVisible();
  await page.getByLabel("Club or custom name").fill("NORTH FC");
  await page.getByLabel("Badge initials").fill("NFC");
  await page.locator(".quick-style summary").click();
  await page.getByLabel("Font type", { exact: true }).selectOption("italic");
  await page.getByRole("button", { name: "Align center", exact: true }).click();
  await page.getByRole("button", { name: "Red & black", exact: true }).click();
  await page
    .getByRole("button", { name: "Create wallpaper", exact: true })
    .click();
  const link = page.getByRole("link", {
    name: "Download wallpaper ↓",
    exact: true,
  });
  await expect(link).toBeVisible({ timeout: 30000 });
  const promise = page.waitForEvent("download");
  await link.click();
  const dl = await promise;
  const metadata = await sharp((await dl.path())!).metadata();
  expect(metadata.width).toBe(1440);
  expect(metadata.height).toBe(3120);
});
test("simple photo creator previews cinematic effects and exports full portrait 4K", async ({
  page,
}) => {
  await page.goto("/smart-fit");
  await page.getByLabel("Choose your photo").setInputFiles({
    name: "player.png",
    mimeType: "image/png",
    buffer: await sharp({
      create: { width: 800, height: 1200, channels: 3, background: "#16435a" },
    })
      .png()
      .toBuffer(),
  });
  await page.getByRole("button", { name: "Fire & ice", exact: true }).click();
  await page.getByLabel("Your screen", { exact: true }).selectOption("4k");
  await expect(page.getByAltText("Your wallpaper design")).toBeVisible();
  await page
    .getByRole("button", { name: "Create wallpaper", exact: true })
    .click();
  const link = page.getByRole("link", {
    name: "Download wallpaper ↓",
    exact: true,
  });
  await expect(link).toBeVisible({ timeout: 30000 });
  const promise = page.waitForEvent("download");
  await link.click();
  const dl = await promise;
  const m = await sharp((await dl.path())!).metadata();
  expect(m.width).toBe(2160);
  expect(m.height).toBe(3840);
});
