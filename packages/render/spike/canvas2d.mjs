import { chromium } from "@playwright/test";
const W = 1920, H = 1080;
const browser = await chromium.launch({ channel: "chrome", args: ["--enable-features=CanvasDrawElement"] });
const page = await browser.newPage({ viewport: { width: W, height: H } });
await page.setContent(`<body style="margin:0;background:#101421"><canvas id="cap" layoutsubtree width="${W}" height="${H}"><div id="root" style="position:relative;width:${W}px;height:${H}px"><canvas id="c2" width="800" height="500" style="position:absolute;left:500px;top:250px"></canvas><canvas id="gl" width="400" height="300" style="position:absolute;left:100px;top:100px"></canvas><img id="im" style="position:absolute;left:1400px;top:100px;width:200px;height:200px"></div></canvas></body>`);
const res = await page.evaluate(async () => {
  const c2 = document.getElementById("c2").getContext("2d"); c2.fillStyle = "#c8402a"; c2.fillRect(0, 0, 800, 500);
  const g = document.getElementById("gl").getContext("webgl", { preserveDrawingBuffer: true }); g.clearColor(0.2, 0.35, 0.5, 1); g.clear(g.COLOR_BUFFER_BIT);
  const im = document.getElementById("im"); im.src = "data:image/svg+xml," + encodeURIComponent("<svg xmlns='http://www.w3.org/2000/svg' width='10' height='10'><rect width='10' height='10' fill='#7cb7a4'/></svg>"); await im.decode();
  const cap = document.getElementById("cap"), root = document.getElementById("root"), ctx = cap.getContext("2d");
  const out = [];
  for (let i = 0; i < 3; i++) {
    await new Promise((r) => { cap.addEventListener("paint", r, { once: true }); cap.requestPaint?.(); setTimeout(r, 500); });
    ctx.clearRect(0, 0, cap.width, cap.height); ctx.drawElementImage(root, 0, 0);
    const at = (x, y) => [...ctx.getImageData(x, y, 1, 1).data].join(",");
    out.push(`2d canvas ${at(900, 500)} | webgl ${at(300, 250)} | img ${at(1500, 200)}`);
  }
  // Fallback check: can the page draw those canvases into the capture canvas itself?
  ctx.drawImage(document.getElementById("gl"), 100, 100);
  out.push("webgl via drawImage " + [...ctx.getImageData(300, 250, 1, 1).data].join(","));
  return out;
});
console.log(res.join("\n"));
await browser.close();
