import { CanvasPainter, buildFramePlan, type Ctx2D, type Frame } from "@cutcut/player";
import { FakeFrame, FakeFrameSource, recorderCanvas, recorderContext } from "./helpers/fakes";
import { makeState } from "./helpers/state";

/** A frame that can paint itself over the whole canvas. */
class FullFrame extends FakeFrame {
  full = 0;
  paintFull(ctx: Ctx2D): boolean {
    this.full++;
    ctx.putImageData({ fake: "full" } as unknown as ImageData, 0, 0);
    return true;
  }
}

function paint(items: object[], transform?: object, width = 640, height = 360) {
  const state = makeState({ width, height, tracks: [{ id: "main", items: [{ id: "c", kind: "clip", source: { in: 0, out: 4, asset: "a" }, ...(transform ? { props: { transform } } : {}), ...items }] }] });
  const source = new FakeFrameSource("a");
  const frame = new FullFrame(source, 0, 1 / 30);
  const rec = recorderContext();
  new CanvasPainter(width, height, recorderCanvas).paint(rec.ctx, buildFramePlan(state, 1), { frames: new Map<string, Frame | null>([["c", frame]]), nested: new Map() });
  return { frame, names: rec.calls.map((c) => c.name) };
}

describe("CanvasPainter fast path for a picture that fills the canvas", () => {
  it("lets the frame paint itself when nothing transforms, fades or filters it", () => {
    const { frame, names } = paint([]);
    expect(frame.full).toBe(1);
    expect(names).toContain("putImageData");
    expect(names).not.toContain("drawImage");
  });

  it.each([
    ["scaled", { scale: 1.2 }],
    ["moved", { position: { x: 10, y: 0 } }],
    ["faded", { opacity: 0.5 }],
    ["rounded", { borderRadius: 12 }],
    ["cropped", { crop: { x: 0, y: 0, width: 0.5, height: 1 } }],
  ])("draws a %s frame the ordinary way", (_name, transform) => {
    const { frame, names } = paint([], transform);
    expect(frame.full).toBe(0);
    expect(names).toContain("drawImage");
  });
});
