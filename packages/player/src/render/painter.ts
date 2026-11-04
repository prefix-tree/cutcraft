import type { BackgroundGradient, DrawOp, FramePlan } from "../model/frame-plan";
import { fitRect, type Matrix2D } from "../model/transform";
import type { AnyCanvas, CreateCanvas, Ctx2D, Frame } from "../types";
import { devWarn } from "../warn";
import { roundedRect, traceMask } from "./masks";
import { ShaderRunner } from "./shaders";

/** The outgoing side of a declared transition, drawn and run through its effects, waiting for the incoming side. */
interface Outgoing {
  readonly id: string;
  readonly canvas: AnyCanvas;
  readonly op: DrawOp;
}

export interface PaintInputs {
  readonly frames: ReadonlyMap<string, Frame | null>;
  readonly nested: ReadonlyMap<string, AnyCanvas>;
}

/**
 * Executes a FramePlan on a 2D context of composition size. Each op is
 * drawn under its own transform, alpha, blend and filter; masks clip; an
 * adjustment op re-filters everything drawn so far through a scratch canvas.
 */
export class CanvasPainter {
  private scratch: AnyCanvas | null = null;
  /** An element drawn on its own before compositing: a feathered mask, vignette, grain. */
  private layer: AnyCanvas | null = null;
  private grain: AnyCanvas | null = null;
  /** Runs the effects and transitions the file declares; made on first use. */
  private shaders: ShaderRunner | null = null;
  /** The outgoing side of a declared transition between two clips, waiting for the incoming side. */
  private outgoing: Outgoing | null = null;
  private outgoingPicture: AnyCanvas | null = null;

  constructor(
    readonly width: number,
    readonly height: number,
    private readonly createCanvas: CreateCanvas,
  ) {}

  paint(ctx: Ctx2D, plan: FramePlan, inputs: PaintInputs): void {
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = "source-over";
    ctx.filter = "none";
    if (plan.clear) ctx.clearRect(0, 0, this.width, this.height);
    else paintBackground(ctx, plan, this.width, this.height);
    if (plan.backgroundBlur) this.blurBackground(ctx, plan, plan.backgroundBlur.id, inputs);
    this.outgoing = null;
    for (const op of plan.ops) {
      if (op.kind === "adjustment") this.adjust(ctx, op);
      else this.drawOp(ctx, op, inputs);
    }
    // An outgoing side whose incoming clip drew nothing (its frame not decoded yet) still shows, as it is.
    const left = this.outgoing as Outgoing | null;
    if (left) this.composite(ctx, left.op, left.canvas);
    this.outgoing = null;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
  }

  private drawOp(ctx: Ctx2D, op: DrawOp, inputs: PaintInputs): void {
    const frame = op.kind === "nested" ? null : (inputs.frames.get(op.id) ?? null);
    const nested = op.kind === "nested" ? (inputs.nested.get(op.id) ?? null) : null;
    if (op.kind !== "nested" && !frame) return;
    if (op.kind === "nested" && !nested) return;
    if ((op.shaders || op.transition) && this.runner().available) {
      this.drawShaded(ctx, op, frame, nested);
      return;
    }
    if (op.shaders || op.transition) warnNoShaders(op);
    ctx.save();
    ctx.globalAlpha = op.opacity;
    ctx.globalCompositeOperation = op.blend;
    ctx.filter = op.filter || "none";
    clipFrame(ctx, op);
    setMatrix(ctx, op.matrix);
    const clipped = this.clip(ctx, op);
    const feathered = !!op.mask && op.mask.feather > 0 && clipped;
    if (feathered || op.post) {
      ctx.restore();
      this.drawLayered(ctx, op, frame, nested, feathered);
      return;
    }
    this.blit(ctx, op, frame, nested);
    ctx.restore();
  }

  /**
   * An element with effects or a transition the file declares: drawn alone, run through its shaders, then composited.
   * The outgoing side of a transition between two clips is kept until the incoming side arrives, and the two are
   * blended in one pass.
   */
  private drawShaded(ctx: Ctx2D, op: DrawOp, frame: Frame | null, nested: AnyCanvas | null): void {
    const feathered = !!op.mask && op.mask.feather > 0;
    const layer = this.alone(op, frame, nested, feathered);
    if (!layer) return;
    const runner = this.runner();
    let picture: AnyCanvas | null = layer;
    try {
      if (op.shaders) picture = runner.effects(layer, op.shaders) ?? layer;
      const x = op.transition;
      if (x?.paired && x.role === "out") {
        // Kept for the incoming side, which comes later in the same plan; drawn by it, not now.
        this.outgoing = { id: x.id, canvas: copyInto(this.outgoingCanvas(), picture), op };
        return;
      }
      if (x) {
        const from = x.paired
          ? this.outgoing?.id === x.id
            ? this.outgoing.canvas
            : null
          : x.role === "out"
            ? picture
            : null;
        const to = x.paired || x.role === "in" ? picture : null;
        picture = runner.transition(from, to, x) ?? picture;
        if (x.paired) this.outgoing = null;
      }
    } catch (error) {
      warnShaderError(op, error);
      picture = layer;
    }
    this.composite(ctx, op, picture);
  }

  private runner(): ShaderRunner {
    this.shaders ??= new ShaderRunner(this.width, this.height, this.createCanvas);
    return this.shaders;
  }

  private outgoingCanvas(): AnyCanvas {
    this.outgoingPicture ??= this.createCanvas(this.width, this.height);
    return this.outgoingPicture;
  }

  /** The footage's picture, blurred and scaled to cover the frame, under everything; skipped when the footage covers the frame itself. */
  private blurBackground(ctx: Ctx2D, plan: FramePlan, id: string, inputs: PaintInputs): void {
    const op = plan.ops.find((o) => o.id === id);
    if (!op || coversCanvas(op, this.width, this.height)) return;
    const nested = op.kind === "nested" ? (inputs.nested.get(id) ?? null) : null;
    const frame = op.kind === "nested" ? null : (inputs.frames.get(id) ?? null);
    const picture = nested ?? frame;
    if (!picture) return;
    const r = Math.round(0.04 * this.height);
    // Grown by 2r on each side, so the blur's transparent fringe falls outside the frame.
    const { x, y, w, h } = fitRect(this, picture, "cover");
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.filter = `blur(${r}px)`;
    if (nested) ctx.drawImage(nested, x - 2 * r, y - 2 * r, w + 4 * r, h + 4 * r);
    else frame!.draw(ctx, x - 2 * r, y - 2 * r, w + 4 * r, h + 4 * r);
    ctx.restore();
  }

  private blit(ctx: Ctx2D, op: DrawOp, frame: Frame | null, nested: AnyCanvas | null): void {
    const { w, h } = op.rect;
    if (nested) ctx.drawImage(nested, 0, 0, w, h);
    else if (frame && !(coversCanvas(op, this.width, this.height) && frame.paintFull?.(ctx, this.width, this.height))) {
      // The manifest describes the original, while a normalized file or proxy may decode at a different size.
      const reference = op.cropReference;
      const crop =
        op.crop && reference
          ? {
              x: (op.crop.x * frame.width) / reference.width,
              y: (op.crop.y * frame.height) / reference.height,
              w: (op.crop.w * frame.width) / reference.width,
              h: (op.crop.h * frame.height) / reference.height,
            }
          : op.crop;
      frame.draw(ctx, 0, 0, w, h, crop);
    }
  }

  /** Applies the border radius and mask as a clip in local coordinates. Returns true when a mask clip was set. */
  private clip(ctx: Ctx2D, op: DrawOp): boolean {
    if (op.borderRadius > 0) {
      ctx.beginPath();
      roundedRect(ctx, 0, 0, op.rect.w, op.rect.h, op.borderRadius);
      ctx.clip();
    }
    if (!op.mask) return false;
    ctx.beginPath();
    if (!traceMask(ctx, op.mask, op.rect)) return false;
    if (op.mask.inverted) {
      ctx.rect(0, 0, op.rect.w, op.rect.h);
      ctx.clip("evenodd");
    } else {
      ctx.clip();
    }
    return true;
  }

  /**
   * The element alone on the layer canvas, then composited: a feathered mask punches it out with a
   * blurred alpha there, and vignette and grain darken or speckle only its own pixels.
   */
  private drawLayered(ctx: Ctx2D, op: DrawOp, frame: Frame | null, nested: AnyCanvas | null, feathered: boolean): void {
    const layer = this.alone(op, frame, nested, feathered);
    if (layer) this.composite(ctx, op, layer);
  }

  /** The element drawn alone on the layer canvas, at its place in the frame, its mask and vignette or grain applied. */
  private alone(op: DrawOp, frame: Frame | null, nested: AnyCanvas | null, feathered: boolean): AnyCanvas | null {
    this.layer ??= this.createCanvas(this.width, this.height);
    const layer = this.layer;
    const lctx = layer.getContext("2d") as Ctx2D | null;
    if (!lctx) return null;
    lctx.setTransform(1, 0, 0, 1, 0, 0);
    lctx.clearRect(0, 0, this.width, this.height);
    lctx.save();
    setMatrix(lctx, op.matrix);
    if (!feathered) this.clip(lctx, op);
    this.blit(lctx, op, frame, nested);
    lctx.restore();
    if (feathered) {
      // Punch the mask through with a blurred alpha: draw the mask shape blurred, keep the element where it lands.
      lctx.save();
      lctx.globalCompositeOperation = "destination-in";
      lctx.filter = `blur(${op.mask!.feather}px)`;
      setMatrix(lctx, op.matrix);
      lctx.beginPath();
      traceMask(lctx, op.mask!, op.rect);
      if (op.mask!.inverted) {
        lctx.rect(0, 0, op.rect.w, op.rect.h);
        lctx.fill("evenodd");
      } else lctx.fill();
      lctx.restore();
    }
    for (const fx of op.post ?? []) {
      lctx.save();
      lctx.globalCompositeOperation = "source-atop";
      if (fx.type === "vignette") {
        setMatrix(lctx, op.matrix);
        const { w, h } = op.rect;
        const r = Math.hypot(w, h) / 2;
        const g = lctx.createRadialGradient(w / 2, h / 2, r * 0.4, w / 2, h / 2, r);
        g.addColorStop(0, "rgba(0,0,0,0)");
        g.addColorStop(1, `rgba(0,0,0,${fx.amount})`);
        lctx.fillStyle = g;
        lctx.fillRect(0, 0, w, h);
      } else {
        const pattern = lctx.createPattern(this.noise(fx.seed, fx.amount), "repeat");
        if (pattern) {
          lctx.fillStyle = pattern;
          lctx.fillRect(0, 0, this.width, this.height);
        }
      }
      lctx.restore();
    }
    return layer;
  }

  /** A picture of the whole frame composited as the op: its opacity, blend, filter, wipe and rounded corners. */
  private composite(ctx: Ctx2D, op: DrawOp, layer: AnyCanvas): void {
    ctx.save();
    ctx.globalAlpha = op.opacity;
    ctx.globalCompositeOperation = op.blend;
    ctx.filter = op.filter || "none";
    clipFrame(ctx, op);
    if (op.borderRadius > 0) {
      setMatrix(ctx, op.matrix);
      ctx.beginPath();
      roundedRect(ctx, 0, 0, op.rect.w, op.rect.h, op.borderRadius);
      ctx.clip();
    }
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.drawImage(layer, 0, 0);
    ctx.restore();
  }

  /** A tile of black and white specks, the same for the same seed; alpha up to `amount`. */
  private noise(seed: number, amount: number): AnyCanvas {
    this.grain ??= this.createCanvas(GRAIN_TILE, GRAIN_TILE);
    const gctx = this.grain.getContext("2d") as Ctx2D | null;
    if (!gctx) return this.grain;
    const img = gctx.createImageData(GRAIN_TILE, GRAIN_TILE);
    const rand = mulberry32(seed);
    for (let i = 0; i < img.data.length; i += 4) {
      const r = rand();
      const v = r < 0.5 ? 0 : 255;
      img.data[i] = img.data[i + 1] = img.data[i + 2] = v;
      img.data[i + 3] = Math.round(Math.abs(r - 0.5) * 2 * amount * 255);
    }
    gctx.putImageData(img, 0, 0);
    return this.grain;
  }

  private adjust(ctx: Ctx2D, op: DrawOp): void {
    if (op.shaders) {
      if (this.runner().available) {
        this.adjustShaded(ctx, op);
        return;
      }
      warnNoShaders(op);
    }
    if (!op.filter && op.opacity >= 1) return;
    this.scratch ??= this.createCanvas(this.width, this.height);
    const sctx = this.scratch.getContext("2d") as Ctx2D | null;
    if (!sctx) return;
    sctx.setTransform(1, 0, 0, 1, 0, 0);
    sctx.globalCompositeOperation = "copy";
    sctx.filter = "none";
    sctx.globalAlpha = 1;
    sctx.drawImage(canvasOf(ctx), 0, 0);
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalCompositeOperation = "source-over";
    ctx.globalAlpha = op.opacity;
    ctx.filter = op.filter || "none";
    ctx.drawImage(this.scratch, 0, 0);
    ctx.restore();
  }

  /** An adjustment with declared effects: everything drawn so far, through the shaders, back over itself. */
  private adjustShaded(ctx: Ctx2D, op: DrawOp): void {
    this.scratch ??= this.createCanvas(this.width, this.height);
    const scratch = copyInto(this.scratch, canvasOf(ctx));
    let picture: AnyCanvas = scratch;
    try {
      picture = this.runner().effects(scratch, op.shaders ?? []) ?? scratch;
    } catch (error) {
      warnShaderError(op, error);
      return;
    }
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalCompositeOperation = "source-over";
    ctx.globalAlpha = op.opacity;
    ctx.filter = op.filter || "none";
    ctx.drawImage(picture, 0, 0);
    ctx.restore();
  }
}

const GRAIN_TILE = 128;

/** `target` holding a copy of `source`, both the frame's size. */
function copyInto(target: AnyCanvas, source: AnyCanvas): AnyCanvas {
  const c = target.getContext("2d") as Ctx2D | null;
  if (!c) return source;
  c.setTransform(1, 0, 0, 1, 0, 0);
  c.globalCompositeOperation = "copy";
  c.globalAlpha = 1;
  c.filter = "none";
  c.drawImage(source, 0, 0);
  c.globalCompositeOperation = "source-over";
  return target;
}

function warnNoShaders(op: DrawOp): void {
  devWarn(
    `shaders:${op.id}`,
    `"${op.id}" uses an effect or transition the file declares; this renderer has no WebGL, so it draws without it (the browser export draws it)`,
  );
}

function warnShaderError(op: DrawOp, error: unknown): void {
  devWarn(`shader-error:${op.id}`, `"${op.id}": ${error instanceof Error ? error.message : String(error)}`);
}

/** A small seeded PRNG on 0..1. */
function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function setMatrix(ctx: Ctx2D, m: Matrix2D): void {
  ctx.setTransform(m.a, m.b, m.c, m.d, m.e, m.f);
}

/** Clips to the op's shown part in composition pixels (a wipe), leaving the transform at identity. */
function clipFrame(ctx: Ctx2D, op: DrawOp): void {
  if (!op.clip) return;
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.beginPath();
  for (const r of op.clip) ctx.rect(r.x, r.y, r.w, r.h);
  ctx.clip();
}

function canvasOf(ctx: Ctx2D): AnyCanvas {
  return ctx.canvas as AnyCanvas;
}

/** Whether a draw op puts its picture over the whole canvas as it is: no transform, crop, clip, fade, filter or blend. */
export function coversCanvas(op: DrawOp, width: number, height: number): boolean {
  const m = op.matrix;
  return (
    m.a === 1 &&
    m.b === 0 &&
    m.c === 0 &&
    m.d === 1 &&
    m.e === 0 &&
    m.f === 0 &&
    op.rect.w === width &&
    op.rect.h === height &&
    !op.crop &&
    op.opacity >= 1 &&
    op.blend === "source-over" &&
    !op.filter &&
    op.borderRadius === 0 &&
    !op.mask &&
    !op.clip &&
    !op.post
  );
}

/** The composition background (a colour or a gradient) over the whole frame. */
export function paintBackground(
  ctx: Ctx2D,
  plan: Pick<FramePlan, "background" | "backgroundGradient">,
  w: number,
  h: number,
): void {
  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.globalAlpha = 1;
  ctx.globalCompositeOperation = "source-over";
  ctx.filter = "none";
  ctx.fillStyle = plan.backgroundGradient ? backgroundFill(ctx, plan.backgroundGradient, w, h) : plan.background;
  ctx.fillRect(0, 0, w, h);
  ctx.restore();
}

/** The same background as CSS, for the preview's ground under backdrop overlays. */
export function backgroundCss(plan: Pick<FramePlan, "background" | "backgroundGradient">): string {
  const g = plan.backgroundGradient;
  if (!g) return plan.background;
  const stops = [...g.stops]
    .sort((a, b) => a.offset - b.offset)
    .map((s) => `${withOpacity(s.color, s.opacity)} ${Math.round(Math.max(0, Math.min(1, s.offset)) * 10000) / 100}%`)
    .join(", ");
  if (g.type === "radial")
    return `radial-gradient(farthest-corner at ${(g.center?.x ?? 0.5) * 100}% ${(g.center?.y ?? 0.5) * 100}%, ${stops})`;
  if (g.type === "conic")
    return `conic-gradient(from ${g.angle ?? 0}deg at ${(g.center?.x ?? 0.5) * 100}% ${(g.center?.y ?? 0.5) * 100}%, ${stops})`;
  return `linear-gradient(${g.angle ?? 180}deg, ${stops})`;
}

/** A canvas gradient for the frame, laid out the way CSS lays out the same gradient on a box of this size. */
export function backgroundFill(ctx: Ctx2D, g: BackgroundGradient, w: number, h: number): CanvasGradient | string {
  const c = g.center ?? { x: 0.5, y: 0.5 };
  const cx = c.x * w,
    cy = c.y * h;
  let grad: CanvasGradient;
  if (g.type === "radial") {
    // CSS's default size: the farthest corner.
    const r = Math.max(Math.hypot(cx, cy), Math.hypot(w - cx, cy), Math.hypot(cx, h - cy), Math.hypot(w - cx, h - cy));
    grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
  } else if (
    g.type === "conic" &&
    typeof (ctx as { createConicGradient?: unknown }).createConicGradient === "function"
  ) {
    grad = (
      ctx as unknown as { createConicGradient(a: number, x: number, y: number): CanvasGradient }
    ).createConicGradient((((g.angle ?? 0) - 90) * Math.PI) / 180, cx, cy);
  } else {
    const rad = ((g.angle ?? 180) * Math.PI) / 180;
    const dx = Math.sin(rad),
      dy = -Math.cos(rad);
    // The CSS gradient line: through the centre, long enough that its ends touch the corners.
    const half = (Math.abs(w * dx) + Math.abs(h * dy)) / 2;
    grad = ctx.createLinearGradient(w / 2 - dx * half, h / 2 - dy * half, w / 2 + dx * half, h / 2 + dy * half);
  }
  for (const s of [...g.stops].sort((a, b) => a.offset - b.offset))
    grad.addColorStop(Math.max(0, Math.min(1, s.offset)), withOpacity(s.color, s.opacity));
  return grad;
}

function withOpacity(color: string, opacity: number | undefined): string {
  if (opacity === undefined || opacity >= 1) return color;
  const hex = color.trim().match(/^#([0-9a-f]{3}|[0-9a-f]{6})$/i);
  if (!hex) return color;
  const h =
    (hex[1] as string).length === 3
      ? (hex[1] as string)
          .split("")
          .map((x) => x + x)
          .join("")
      : (hex[1] as string);
  return `rgba(${parseInt(h.slice(0, 2), 16)}, ${parseInt(h.slice(2, 4), 16)}, ${parseInt(h.slice(4, 6), 16)}, ${Math.max(0, opacity)})`;
}
