import { chromium } from "@playwright/test";
import { writeFileSync } from "node:fs";
const S = process.argv[2];
const W = 1920, H = 1080;
const gl = `<canvas id="gl" width="800" height="500" style="position:absolute;left:500px;top:250px"></canvas>`;
const draw = `const g=document.getElementById("gl").getContext("webgl",{preserveDrawingBuffer:true});g.clearColor(0.78,0.25,0.16,1);g.clear(g.COLOR_BUFFER_BIT);g.enable(g.SCISSOR_TEST);g.scissor(200,100,400,300);g.clearColor(0.2,0.35,0.5,1);g.clear(g.COLOR_BUFFER_BIT);`;
for (const args of [["--enable-features=CanvasDrawElement"], ["--enable-features=CanvasDrawElement", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"]]) {
  const browser = await chromium.launch({ channel: "chrome", args });
  const page = await browser.newPage({ viewport: { width: W, height: H } });
  await page.setContent(`<body style="margin:0;background:#101421"><canvas id="cap" layoutsubtree width="${W}" height="${H}"><div id="root" style="position:relative;width:${W}px;height:${H}px">${gl}</div></canvas></body>`);
  const res = await page.evaluate(async (draw) => {
    eval(draw);
    const cap = document.getElementById("cap"), root = document.getElementById("root"), ctx = cap.getContext("2d");
    const out = [];
    out.push("requestPaint:" + typeof cap.requestPaint + " onpaint:" + ("onpaint" in cap));
    for (let i = 0; i < 4; i++) {
      await new Promise((r) => { cap.addEventListener("paint", r, { once: true }); cap.requestPaint?.(); setTimeout(r, 500); });
      ctx.clearRect(0, 0, cap.width, cap.height); ctx.drawElementImage(root, 0, 0);
      const px = ctx.getImageData(900, 500, 1, 1).data; // inside the GL canvas, outside the scissor box
      const px2 = ctx.getImageData(900, 450, 1, 1).data; // inside the scissor box
      out.push([...px, "|", ...px2].join(","));
    }
    return out;
  }, draw);
  console.log(args.join(" "), "\n  ", res.join("\n   "));
  await browser.close();
}
