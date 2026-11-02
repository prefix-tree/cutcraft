// Spike: what HTML-in-Canvas (drawElementImage) captures, and how fast, against a real screenshot. Throwaway.
import { chromium } from "@playwright/test";
import { Canvas, loadImage } from "skia-canvas";

const W = 1920, H = 1080;
const FEATURES = {
  plain: `<div style="position:absolute;left:200px;top:200px;width:600px;height:300px;background:#c8402a;color:#fff;font:bold 80px sans-serif;display:flex;align-items:center;justify-content:center">Title</div>`,
  "css-3d": `<div style="position:absolute;left:600px;top:250px;perspective:900px"><div style="width:600px;height:400px;background:linear-gradient(135deg,#3d5a80,#e0a458);transform:rotateY(35deg) rotateX(12deg);transform-style:preserve-3d;font:bold 70px sans-serif;color:#fff;display:flex;align-items:center;justify-content:center">3D card</div></div>`,
  filter: `<div style="position:absolute;left:300px;top:300px;width:800px;height:400px;background:linear-gradient(90deg,red,blue);filter:blur(8px) hue-rotate(90deg)"></div>`,
  "backdrop-filter": `<div style="position:absolute;inset:0;background:repeating-linear-gradient(45deg,#c8402a 0 40px,#101421 40px 80px)"></div><div style="position:absolute;left:500px;top:300px;width:900px;height:450px;backdrop-filter:blur(12px) saturate(0.3);background:rgba(255,255,255,0.15)"></div>`,
  blend: `<div style="position:absolute;inset:0;background:linear-gradient(90deg,#f3ead6,#3d5a80)"></div><div style="position:absolute;left:400px;top:200px;font:900 260px sans-serif;color:#c8402a;mix-blend-mode:multiply">BLEND</div>`,
  mask: `<div style="position:absolute;left:300px;top:150px;width:1200px;height:700px;background:linear-gradient(135deg,#e0a458,#c8402a);-webkit-mask-image:radial-gradient(circle,black 40%,transparent 70%);mask-image:radial-gradient(circle,black 40%,transparent 70%)"></div>`,
  "svg-filter": `<svg width="0" height="0" style="position:absolute"><filter id="t"><feTurbulence baseFrequency="0.02" numOctaves="2"/><feDisplacementMap in="SourceGraphic" scale="40"/></filter></svg><div style="position:absolute;left:400px;top:300px;width:900px;height:300px;background:#3d5a80;filter:url(#t);font:bold 120px sans-serif;color:#fff">Wobble</div>`,
  keyframes: `<style>@keyframes spin{from{transform:rotate(0)}to{transform:rotate(360deg)}}</style><div style="position:absolute;left:800px;top:350px;width:300px;height:300px;background:#7cb7a4;animation:spin 4s linear infinite"></div>`,
  webgl: `<canvas id="gl" width="800" height="500" style="position:absolute;left:500px;top:250px"></canvas><script>const g=document.getElementById("gl").getContext("webgl",{preserveDrawingBuffer:true});g.clearColor(0.78,0.25,0.16,1);g.enable(g.SCISSOR_TEST);g.clear(g.COLOR_BUFFER_BIT);g.scissor(200,100,400,300);g.clearColor(0.2,0.35,0.5,1);g.clear(g.COLOR_BUFFER_BIT);</script>`,
};

const browser = await chromium.launch({ channel: "chrome", args: ["--enable-features=CanvasDrawElement"] });
const page = await browser.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: 1 });
const psnr = (a, b) => { let se = 0, n = 0; for (let i = 0; i < a.length; i += 4) for (let c = 0; c < 3; c++) { const d = a[i + c] - b[i + c]; se += d * d; n++; } return se === 0 ? 99 : 10 * Math.log10((255 * 255 * n) / se); };
const rgba = async (png) => { const img = await loadImage(png); const c = new Canvas(W, H); const x = c.getContext("2d"); x.drawImage(img, 0, 0); return x.getImageData(0, 0, W, H).data; };

for (const [name, html] of Object.entries(FEATURES)) {
  await page.setContent(`<!doctype html><body style="margin:0;background:#101421;overflow:hidden">
    <canvas id="cap" layoutsubtree width="${W}" height="${H}" style="position:absolute;left:0;top:0;width:${W}px;height:${H}px">
      <div id="root" style="position:relative;width:${W}px;height:${H}px;background:#101421">${html}</div>
    </canvas></body>`);
  await page.evaluate(() => document.getAnimations().forEach((a) => { a.pause(); a.currentTime = 500; }));
  await page.waitForTimeout(200);
  // The capture: draw the live subtree into its canvas, read the pixels back.
  const drawn = await page.evaluate(async () => {
    const cap = document.getElementById("cap"), root = document.getElementById("root"), ctx = cap.getContext("2d");
    await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
    const t0 = performance.now();
    let n = 0;
    for (; n < 30; n++) { ctx.clearRect(0, 0, cap.width, cap.height); ctx.drawElementImage(root, 0, 0); }
    const per = (performance.now() - t0) / n;
    return { per, url: cap.toDataURL("image/png") };
  }).catch((e) => ({ error: String(e) }));
  if (drawn.error) { console.log(name.padEnd(16), "ERROR", drawn.error.slice(0, 160)); continue; }
  // The reference: the same HTML in a plain page, no canvas, screenshotted as a browser shows it.
  const ref = await browser.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: 1 });
  await ref.setContent(`<!doctype html><body style="margin:0;background:#101421;overflow:hidden"><div style="position:relative;width:${W}px;height:${H}px;background:#101421">${html}</div></body>`);
  await ref.evaluate(() => document.getAnimations().forEach((a) => { a.pause(); a.currentTime = 500; }));
  await ref.waitForTimeout(200);
  const shot = await ref.screenshot({ type: "png" });
  await ref.close();
  const a = await rgba(Buffer.from(drawn.url.split(",")[1], "base64")), b = await rgba(shot);
  let ink = 0; for (let i = 0; i < a.length; i += 4) if (Math.abs(a[i] - 0x10) + Math.abs(a[i + 1] - 0x14) + Math.abs(a[i + 2] - 0x21) > 30) ink++;
  console.log(name.padEnd(16), `PSNR ${psnr(a, b).toFixed(1).padStart(5)} dB`, `ink ${(100 * ink / (W * H)).toFixed(1)}%`);
}
await browser.close();
