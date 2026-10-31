import { createElement as h } from "react";
import { Caption, Captions, Clip, Composition, Keyframe, Shape, Title, Track, collect, resolve, type AssetManifest } from "@cutcut/kit";
import { mediaDir } from "../../player/e2e/gen-media";
import { manifest } from "../../player/e2e/app/composition";
import { checkLayout, directoryResolver, subjectRects, type LayoutIssue } from "../src";

const box = (id: string, x: number, y: number, w: number, hgt: number, start = 0, duration = 1, children: unknown[] = []) =>
  h(Shape, { id, shape: "rectangle", width: w, height: hgt, fill: "#ff0000", start, duration, transform: { position: { x, y } } }, ...(children as []));

async function check(composition: ReturnType<typeof h>, m: AssetManifest = manifest, extra: Partial<Parameters<typeof checkLayout>[0]> = {}) {
  const state = resolve(collect(composition), m);
  expect(state.errors).toEqual([]);
  return checkLayout({ state, media: directoryResolver(mediaDir, m), ...extra });
}

const brief = (issues: readonly LayoutIssue[]) => issues.map((i) => `${i.rule}:${i.id}${i.with ? `>${i.with}` : ""}@${i.from.toFixed(2)}-${i.to.toFixed(2)}`);

describe("checkLayout", () => {
  it("reports frame edges, the safe zone and captions, as runs of samples", async () => {
    // 640×360 at 30 fps; title-safe keeps 32 px at the sides and 18 px top and bottom.
    const result = await check(h(Composition, { fps: 30, width: 640, height: 360 },
      h(Track, { id: "t", layout: "free" },
        box("fine", 0, -60, 60, 60),
        box("edge", 300, -60, 100, 100),
        box("margin", 290, -60, 40, 40),
        box("low", 0, 130, 400, 30, 0.5, 0.5),
        h(Title, { id: "hi", start: 0, duration: 1, size: 40 }, "Hi"),
      ),
      h(Captions, { id: "caps", style: { position: "bottom", size: 30 } }, h(Caption, { id: "c1", start: 0, end: 1, text: "Hello world" })),
    ));
    expect(result.samples).toBe(30);
    const issues = brief(result.issues);
    expect(issues).toContain("frame-edge:edge@0.00-0.97");
    expect(issues).toContain("safe-zone:margin>title-safe@0.00-0.97");
    expect(issues).toContain("captions:low>caps@0.50-0.97");
    expect(issues.filter((i) => i.includes(":fine") || i.includes(":hi") || i.includes(":caps"))).toEqual([]);
  });

  it("catches what happens between samples a person would take: a slide into the edge", async () => {
    const result = await check(h(Composition, { fps: 30, width: 640, height: 360 },
      h(Track, { id: "t", layout: "free" },
        box("slide", 0, 0, 60, 60, 0, 2, [
          h(Keyframe, { id: "k1", property: "transform.position.x", at: 1, value: 0 }),
          h(Keyframe, { id: "k2", property: "transform.position.x", at: 2, value: 400 }),
        ]),
      ),
    ), manifest, { safeZone: { top: 0, right: 0, bottom: 0, left: 0 } });
    const [edge] = result.issues;
    expect(result.issues).toHaveLength(1);
    // The right side (320 + x + 30) passes 640 once x > 290: 1.725 s into the ramp.
    expect(edge).toMatchObject({ rule: "frame-edge", id: "slide" });
    expect(edge!.from).toBeGreaterThan(1.68);
    expect(edge!.from).toBeLessThan(1.78);
    expect(edge!.to).toBeCloseTo(59 / 30);
  });

  it("names a platform zone, and leaves out backgrounds that fill the frame", async () => {
    // 360×640 vertical: TikTok's bottom 660/1920 is 220 px, so anything below y 420 is under its UI.
    const result = await check(h(Composition, { fps: 10, width: 360, height: 640 },
      h(Track, { id: "t", layout: "free" },
        box("bg", 0, 0, 360, 640),
        box("cta", 0, 200, 200, 60),
      ),
    ), manifest, { safeZone: "tiktok" });
    expect(brief(result.issues)).toEqual(["safe-zone:cta>tiktok@0.00-0.90"]);
  });

  it("checks against the manifest's subject boxes through the clip's transform", async () => {
    const m: AssetManifest = { assets: { ...manifest.assets, bars: { ...manifest.assets.bars!, subjects: [{ t: 0, x: 0.4, y: 0.2, w: 0.2, h: 0.5 }, { t: 2, x: 0, y: 0, w: 0.1, h: 0.1 }] } } };
    const el = h(Composition, { fps: 10, width: 640, height: 360 },
      h(Track, { id: "v" }, h(Clip, { id: "c", src: "asset:bars", in: 0, out: 2 })),
      h(Track, { id: "t", layout: "free" },
        box("face", 0, 0, 40, 40),
        box("aside", -200, 0, 40, 40),
      ),
    );
    const result = await check(el, m);
    // The second box (t 2) is nearer from 1 s on and sits in the top-left corner, clear of "face".
    expect(brief(result.issues)).toEqual(["subject:face>subject@0.00-0.90"]);

    // Scaled to half about the centre, the subject's box (256..384 × 72..252) halves too.
    const scaled = resolve(collect(h(Composition, { fps: 10, width: 640, height: 360 },
      h(Track, { id: "v" }, h(Clip, { id: "c", src: "asset:bars", in: 0, out: 2, transform: { scale: 0.5 } })),
    )), m);
    const [r] = subjectRects(scaled, 0);
    expect(r!.x).toBeCloseTo(288);
    expect(r!.y).toBeCloseTo(126);
    expect(r!.w).toBeCloseTo(64);
    expect(r!.h).toBeCloseTo(90);
  });

  it("falls back to a given subject region while footage without subject boxes shows", async () => {
    const el = h(Composition, { fps: 10, width: 640, height: 360 },
      h(Track, { id: "v" }, h(Clip, { id: "c", src: "asset:bars", in: 0, out: 1 })),
      h(Track, { id: "t", layout: "free" }, box("face", 0, 0, 40, 40, 0, 2)),
    );
    const result = await check(el, manifest, { subject: { x: 0.3, y: 0.1, w: 0.4, h: 0.6 } });
    // The clip ends at 1 s; after it there is no footage, so no subject.
    expect(brief(result.issues)).toEqual(["subject:face>subject@0.00-0.90"]);
  });
});
