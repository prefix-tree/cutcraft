import {
  buildFramePlan,
  CanvasPainter,
  captureWarnings,
  type DrawOp,
  type Frame,
  type FramePlan,
} from "@cutcraft/player";

import { FakeFrame, FakeFrameSource, recorderCanvas, recorderContext } from "./helpers/fakes";
import { makeState } from "./helpers/state";

describe("CanvasPainter blur background", () => {
  function paintBlur(transform?: object) {
    const state = makeState({
      width: 640,
      height: 360,
      background: { mode: "blur" },
      tracks: [
        {
          id: "main",
          items: [
            {
              id: "c",
              kind: "clip",
              source: { in: 0, out: 4, asset: "a" },
              ...(transform ? { props: { transform } } : {}),
            },
          ],
        },
      ],
    });
    const rec = recorderContext();
    new CanvasPainter(640, 360, recorderCanvas).paint(rec.ctx, buildFramePlan(state, 1), {
      frames: new Map<string, Frame | null>([["c", new FakeFrame(new FakeFrameSource("a"), 0, 1 / 30)]]),
      nested: new Map(),
    });
    return rec.calls;
  }

  it("draws the footage blurred and grown past the frame before the footage itself", () => {
    const calls = paintBlur({ scale: 0.5 });
    const draws = calls.filter((c) => c.name === "drawImage");
    expect(draws).toHaveLength(2);
    // r = round(0.04 · 360) = 14; the cover rect of a 640×360 frame, grown by 2r each side.
    expect(draws[0]!.args.slice(1)).toEqual([-28, -28, 696, 416]);
    expect(calls.findIndex((c) => c.name === "set:filter" && c.args[0] === "blur(14px)")).toBeLessThan(
      calls.indexOf(draws[0]!),
    );
  });

  it("skips the blur when the footage covers the frame", () => {
    const calls = paintBlur();
    expect(calls.filter((c) => c.name === "drawImage")).toHaveLength(1);
    expect(calls.some((c) => c.name === "set:filter" && String(c.args[0]).startsWith("blur("))).toBe(false);
  });
});

describe("CanvasPainter clips", () => {
  function paintOp(op: Partial<DrawOp>, webgl = true) {
    const rec = recorderContext();
    const base: DrawOp = {
      id: "c",
      kind: "video",
      rect: { x: 0, y: 0, w: 640, h: 360 },
      matrix: { a: 0.5, b: 0, c: 0, d: 0.5, e: 10, f: 20 },
      fit: "contain",
      opacity: 1,
      blend: "source-over",
      filter: "",
      borderRadius: 0,
    };
    const plan: FramePlan = { time: 0, frame: 0, background: "#000", ops: [{ ...base, ...op }], warnings: [] };
    // The recorder answers every getContext, WebGL included; without WebGL, a canvas that has none.
    const create = webgl
      ? recorderCanvas
      : (w: number, h: number) => {
          const c = recorderCanvas(w, h) as unknown as { getContext: (type: string) => unknown };
          const two = c.getContext.bind(c);
          c.getContext = (type) => (type === "webgl2" ? null : two(type));
          return c as unknown as OffscreenCanvas;
        };
    new CanvasPainter(640, 360, create).paint(rec.ctx, plan, {
      frames: new Map<string, Frame | null>([["c", new FakeFrame(new FakeFrameSource("a"), 0, 1 / 30)]]),
      nested: new Map(),
    });
    return rec.calls;
  }

  it("draws a built-in shader effect as its CSS filter where there is no WebGL, without a warning", () => {
    const levels = {
      name: "levels",
      sources: ["vec4 effect(vec2 uv) { return texture(image, uv); }"],
      params: {},
      time: 0,
    };
    const calls = paintOp(
      {
        filter: "blur(2px)",
        fallbackFilter: "blur(2px) brightness(1.2)",
        shaders: [{ ...levels, builtIn: true }],
      },
      false,
    );
    expect(calls.some((c) => c.name === "set:filter" && c.args[0] === "blur(2px) brightness(1.2)")).toBe(true);
  });

  it("draws a shader-only built-in (lut) without it where there is no WebGL, and says so", () => {
    const warnings: string[] = [];
    captureWarnings((m) => warnings.push(m));
    const lut = { name: "lut", sources: ["vec4 effect(vec2 uv) { return texture(image, uv); }"], params: {}, time: 0 };
    const calls = paintOp({ filter: "blur(2px)", shaders: [{ ...lut, builtIn: true }] }, false);
    expect(calls.some((c) => c.name === "set:filter" && c.args[0] === "blur(2px)")).toBe(true);
    expect(warnings.join(" ")).toContain('"c" uses a shader effect or transition; this renderer has no WebGL');
    captureWarnings(null);
  });

  it("crossfades a built-in shader transition where there is no WebGL, without a warning", () => {
    const warnings: string[] = [];
    captureWarnings((m) => warnings.push(m));
    const calls = paintOp(
      {
        opacity: 1,
        fallbackOpacity: 0.25,
        transition: {
          id: "x",
          name: "iris",
          builtIn: true,
          source: "vec4 transition(vec2 uv) { return texture(to, uv); }",
          params: {},
          progress: 0.25,
          time: 0.25,
          role: "in",
          paired: false,
        },
      },
      false,
    );
    expect(calls.some((c) => c.name === "set:globalAlpha" && c.args[0] === 0.25)).toBe(true);
    expect(warnings).toEqual([]);
    captureWarnings(null);
  });

  it("clips a wipe in composition pixels before the element's matrix", () => {
    const calls = paintOp({ clip: [{ x: 320, y: 0, w: 320, h: 360 }] });
    const rect = calls.findIndex((c) => c.name === "rect" && c.args[0] === 320);
    expect(calls[rect - 2]).toEqual({ name: "setTransform", args: [1, 0, 0, 1, 0, 0] });
    expect(calls.findIndex((c) => c.name === "setTransform" && c.args[0] === 0.5)).toBeGreaterThan(rect);
  });

  it("keeps the corner radius and the wipe when a feathered mask goes through the layer", () => {
    const calls = paintOp({
      borderRadius: 12,
      clip: [{ x: 320, y: 0, w: 320, h: 360 }],
      mask: { shape: { rect: { x: 0, y: 0, width: 1, height: 1 } }, feather: 8, inverted: false, opacity: 1 },
    });
    const last = calls.map((c) => c.name).lastIndexOf("drawImage");
    const before = calls.slice(0, last).map((c) => c.name);
    expect(before.lastIndexOf("clip")).toBeGreaterThan(before.lastIndexOf("restore"));
    expect(calls.slice(before.lastIndexOf("restore"), last).filter((c) => c.name === "clip")).toHaveLength(2);
  });
});

describe("CanvasPainter vignette and grain", () => {
  function paintPost(t: number) {
    const canvases: ReturnType<typeof recorderContext>[] = [];
    const create = (width: number, height: number) => {
      const rec = recorderContext();
      Object.assign(rec.canvas, { width, height });
      canvases.push(rec);
      return rec.canvas as unknown as OffscreenCanvas;
    };
    const state = makeState({
      width: 640,
      height: 360,
      tracks: [
        {
          id: "main",
          items: [
            {
              id: "c",
              kind: "clip",
              source: { in: 0, out: 4, asset: "a" },
              children: [
                { id: "v", kind: "effect", props: { type: "vignette" } },
                { id: "g", kind: "effect", props: { type: "grain" } },
              ],
            },
          ],
        },
      ],
    });
    const main = recorderContext();
    const painter = new CanvasPainter(640, 360, create);
    const frames = new Map<string, Frame | null>([["c", new FakeFrame(new FakeFrameSource("a"), 0, 1 / 30)]]);
    painter.paint(main.ctx, buildFramePlan(state, t), { frames, nested: new Map() });
    painter.paint(main.ctx, buildFramePlan(state, t), { frames, nested: new Map() });
    return { main: main.calls, canvases };
  }
  const tiles = (r: ReturnType<typeof paintPost>) =>
    r.canvases[1]!.calls.filter((c) => c.name === "putImageData").map((c) => (c.args[0] as ImageData).data);

  it("darkens and speckles only the element's pixels on a reused layer, then composites it", () => {
    const r = paintPost(1);
    expect(r.canvases).toHaveLength(2);
    const layer = r.canvases[0]!.calls;
    expect(layer.filter((c) => c.name === "drawImage")).toHaveLength(2);
    expect(layer.filter((c) => c.name === "set:globalCompositeOperation" && c.args[0] === "source-atop")).toHaveLength(
      4,
    );
    expect(layer.some((c) => c.name === "createRadialGradient")).toBe(true);
    expect(layer.some((c) => c.name === "createPattern")).toBe(true);
    expect(r.main.filter((c) => c.name === "drawImage").map((c) => c.args[0])).toEqual([
      r.canvases[0]!.canvas,
      r.canvases[0]!.canvas,
    ]);
  });

  it("draws the same grain for the same frame and new grain for the next", () => {
    const [a, b] = tiles(paintPost(1));
    expect(a).toEqual(b);
    expect(a!.some((v, i) => i % 4 === 3 && v > 0)).toBe(true);
    expect(tiles(paintPost(1 + 1 / 30))[0]).not.toEqual(a);
  });
});

describe("CanvasPainter proxy crop coordinates", () => {
  it.each([
    [1920, 1080],
    [640, 360],
  ])("preserves a normalized crop on a %i × %i decoded frame", (width, height) => {
    const state = makeState({
      width: 1080,
      height: 1920,
      tracks: [
        {
          id: "main",
          items: [
            {
              id: "c",
              kind: "clip",
              source: { in: 0, out: 4, asset: "a" },
              props: { transform: { crop: { x: 0.35, y: 0.1, width: 0.3, height: 0.8 } } },
            },
          ],
        },
      ],
    });
    const draw = vi.fn();
    const frame: Frame = {
      width,
      height,
      timestamp: 1,
      duration: 1 / 30,
      draw,
      retain() {
        return this;
      },
      close() {},
    };
    const plan = buildFramePlan(state, 1);
    new CanvasPainter(1080, 1920, recorderCanvas).paint(recorderContext().ctx, plan, {
      frames: new Map([["c", frame]]),
      nested: new Map(),
    });
    const crop = draw.mock.calls[0]![5];
    expect(crop.x / width).toBeCloseTo(0.35);
    expect(crop.y / height).toBeCloseTo(0.1);
    expect(crop.w / width).toBeCloseTo(0.3);
    expect(crop.h / height).toBeCloseTo(0.8);
  });
});
