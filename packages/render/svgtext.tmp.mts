import { Canvas, loadImage, FontLibrary } from "skia-canvas";
import { createRequire } from "node:module";
const [which, fam = "sans-serif", reg] = process.argv.slice(2);
if (reg) {
  const require = createRequire(import.meta.url);
  const dir = require.resolve("@fontsource/playfair-display/package.json").replace(/package\.json$/, "files/");
  FontLibrary.use("Playfair Display", [`${dir}playfair-display-latin-400-normal.woff`]);
}
const body =
  which === "text"
    ? `<text x="10" y="70" font-family="${fam}" font-size="60" fill="#fff">Hamburg</text>`
    : `<circle cx="50" cy="50" r="40" fill="#fff"/>`;
const img = await loadImage(
  Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="400" height="100">${body}</svg>`),
);
const c = new Canvas(400, 100);
const ctx = c.getContext("2d");
ctx.drawImage(img, 0, 0);
const d = ctx.getImageData(0, 0, 400, 100).data;
let l = 400,
  r = 0,
  n = 0;
for (let y = 0; y < 100; y++)
  for (let x = 0; x < 400; x++)
    if (d[(y * 400 + x) * 4 + 3]! > 128) {
      n++;
      l = Math.min(l, x);
      r = Math.max(r, x);
    }
console.log(which, fam, reg ?? "", n, l, r);
