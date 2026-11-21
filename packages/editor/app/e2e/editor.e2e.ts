import { readFileSync } from "node:fs";

import { expect, type Page, test } from "@playwright/test";

const original = readFileSync(new URL("../video.tsx", import.meta.url), "utf8");

/** The file as the editor's edits so far leave it. */
const source = (page: Page) => page.evaluate(() => window.__editor!.source());
/** The lines of the file that are not in the original. */
const changed = async (page: Page) => {
  const before = new Set(original.split("\n"));
  return (await source(page)).split("\n").filter((line) => !before.has(line));
};
/**
 * The editor and the sdk agree: the actions the gestures ran, put through a fresh executor with no editor around it,
 * write the same file.
 */
const agrees = async (page: Page) => {
  const [actions, viaSdk] = await page.evaluate(() => {
    const e = window.__editor!;
    return [e.actions.length, e.replay(e.actions)] as const;
  });
  expect(actions).toBeGreaterThan(0);
  expect(await source(page)).toBe(viaSdk);
};

const bar = (page: Page, id: string) => page.locator(`[data-editor-bar="${id}"]`);
/** Presses on a bar at `at` (0 is its left edge, 1 its right) and drags it `dx` pixels. */
async function drag(page: Page, id: string, at: number, dx: number) {
  const box = (await bar(page, id).boundingBox())!;
  const x = box.x + Math.min(Math.max(box.width * at, 2), box.width - 2);
  const y = box.y + box.height / 2;
  await page.mouse.move(x, y);
  await page.mouse.down();
  await page.mouse.move(x + dx, y, { steps: 8 });
  await page.mouse.up();
}
const field = (page: Page, label: string) => page.locator(`[data-editor-field="${label}"]`);

test.beforeEach(async ({ page }) => {
  await page.goto("/");
  await expect(bar(page, "file")).toBeVisible();
});

test("dragging a bar's end trims it, and only its duration changes in the file", async ({ page }) => {
  await drag(page, "file", 1, 40); // 40 px at 80 px a second: half a second, on a frame
  const lines = await changed(page);
  expect(lines).toHaveLength(1);
  expect(lines[0]).toContain('id="file" start={3} duration={3}');
  await agrees(page);
});

test("dragging a bar's start trims it from the left", async ({ page }) => {
  await drag(page, "outro", 0, 16);
  expect(await changed(page)).toEqual([expect.stringContaining('id="outro" start={6.2} duration={2.3}')]);
  await agrees(page);
});

test("dragging a bar moves it", async ({ page }) => {
  await drag(page, "hint", 0.5, 80);
  expect(await changed(page)).toEqual([expect.stringContaining('id="hint" start={2} duration={4}')]);
  await agrees(page);
});

test("a click selects without editing", async ({ page }) => {
  await bar(page, "file").click();
  await expect(bar(page, "file")).toHaveAttribute("aria-pressed", "true");
  await expect(page.locator('[data-editor-layer="file"]')).toHaveAttribute("aria-pressed", "true");
  expect(await changed(page)).toEqual([]);
});

test("the inspector writes a number, a choice and the text", async ({ page }) => {
  await bar(page, "file").click();
  const size = field(page, "size").locator("input");
  await size.fill("72");
  await size.press("Enter");
  await field(page, "blend").getByRole("combobox").click();
  await page.getByRole("option", { name: "multiply", exact: true }).click();
  const text = page.getByRole("textbox", { name: "Text" });
  await text.fill("A video is a TSX file");
  await text.blur();
  const out = await source(page);
  expect(out).toContain('blend="multiply"');
  expect(out).toContain("size: 72 }}");
  expect(out).toContain("A video is a TSX file");
  await agrees(page);
});

test("a prop written as a name is shown locked", async ({ page }) => {
  await bar(page, "credit").click();
  await expect(field(page, "size").locator("input")).toBeDisabled();
  await expect(field(page, "size").getByLabel("Written as code in the file")).toBeVisible();
});

test("delete with the key, then undo: the element is in the file once", async ({ page }) => {
  await bar(page, "file").click();
  await page.keyboard.press("Delete");
  await expect(bar(page, "file")).toHaveCount(0);
  expect(await source(page)).not.toContain('id="file"');
  await page.keyboard.press("ControlOrMeta+z");
  await expect(bar(page, "file")).toBeVisible();
  const out = await source(page);
  expect(out.split('id="file"')).toHaveLength(2);
  expect(out).toBe(original);
});

test("undo and redo through the buttons", async ({ page }) => {
  await drag(page, "file", 1, 40);
  const edited = await source(page);
  await page.getByRole("button", { name: "Undo" }).click();
  expect(await source(page)).toBe(original);
  await page.getByRole("button", { name: "Redo" }).click();
  expect(await source(page)).toBe(edited);
});

test("the arrow keys move the selection by a frame", async ({ page }) => {
  await bar(page, "hint").click();
  for (let i = 0; i < 3; i++) await page.keyboard.press("ArrowRight");
  expect(await changed(page)).toEqual([expect.stringContaining('id="hint" start={1.1}')]);
  await agrees(page);
});

test("the Source tab shows the changed line and downloads the file", async ({ page }) => {
  await drag(page, "file", 1, 40);
  await page.getByRole("tab", { name: "Source" }).click();
  const marked = page.locator("[data-editor-source] [data-changed]");
  await expect(marked).toHaveCount(1);
  await expect(marked).toContainText("duration={3}");
  const [download] = await Promise.all([
    page.waitForEvent("download"),
    page.getByRole("button", { name: "Download" }).click(),
  ]);
  expect(download.suggestedFilename()).toBe("video.tsx");
  const saved = readFileSync((await download.path())!, "utf8");
  expect(saved).toBe(await source(page));
});
