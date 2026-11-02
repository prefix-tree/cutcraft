import { chromium } from "@playwright/test";
const W = 1920, H = 1080;
for (const args of [["--enable-features=CanvasDrawElement"], ["--enable-features=CanvasDrawElement", "--disable-accelerated-2d-canvas"]]) {
  const browser = await chromium.launch({ channel: "chrome", args });
  const page = await browser.newPage({ viewport: { width: W, height: H } });
  await page.setContent(`<body style="margin:0"><canvas id="cap" layoutsubtree width="${W}" height="${H}"><div id="root" style="position:relative;width:${W}px;height:${H}px"><canvas id="a" width="400" height="300" style="position:absolute;left:0;top:0"></canvas><canvas id="b" width="400" height="300" style="position:absolute;left:500px;top:0"></canvas></div></canvas></body>`);
  const res = await page.evaluate(async () => {
    const cap = document.getElementById("cap"), root = document.getElementById("root"), ctx = cap.getContext("2d");
    const paint = () => new Promise((r) => { cap.addEventListener("paint", r, { once: true }); cap.requestPaint?.(); setTimeout(r, 400); });
    const a = document.getElementById("a").getContext("2d"); a.fillStyle = "#c8402a"; a.fillRect(0, 0, 400, 300);
    const b = document.getElementById("b").getContext("2d", { willReadFrequently: true }); b.fillStyle = "#3d5a80"; b.fillRect(0, 0, 400, 300);
    const out = [];
    for (let i = 0; i < 3; i++) {
      await paint();
      ctx.clearRect(0, 0, cap.width, cap.height); ctx.drawElementImage(root, 0, 0);
      out.push(`accelerated ${[...ctx.getImageData(200, 150, 1, 1).data]} | willReadFrequently ${[...ctx.getImageData(700, 150, 1, 1).data]}`);
      a.fillStyle = i % 2 ? "#c8402a" : "#e0a458"; a.fillRect(0, 0, 400, 300);
    }
    return out;
  });
  console.log(args.join(" "), "\n  " + res.join("\n  "));
  await browser.close();
}
