import type { BackgroundGradient, DrawOp, FramePlan } from "../model/frame-plan";
import type { Matrix2D } from "../model/transform";
import type { AnyCanvas, CreateCanvas, Ctx2D, Frame } from "../types";
import { roundedRect, traceMask } from "./masks";

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
    ctx.fillStyle = plan.backgroundGradient ? backgroundFill(ctx, plan.backgroundGradient, this.width, this.height) : plan.background;
    ctx.fillRect(0, 0, this.width, this.height);
    for (const op of plan.ops) {
      if (op.kind === "adjustment") this.adjust(ctx, op);
      else this.drawOp(ctx, op, inputs);
    }
    ctx.setTransform(1, 0, 0, 1, 0, 0);
  }

  private drawOp(ctx: Ctx2D, op: DrawOp, inputs: PaintInputs): void {
    const frame = op.kind === "nested" ? null : inputs.frames.get(op.id) ?? null;
    const nested = op.kind === "nested" ? inputs.nested.get(op.id) ?? null : null;
    if (op.kind !== "nested" && !frame) return;
    if (op.kind === "nested" && !nested) return;
    ctx.save();
    ctx.globalAlpha = op.opacity;
    ctx.globalCompositeOperation = op.blend;
    ctx.filter = op.filter || "none";
    setMatrix(ctx, op.matrix);
    const clipped = this.clip(ctx, op);
    if (op.mask && op.mask.feather > 0 && clipped) {
      // Feathered masks: draw the element into a scratch layer, blur its clip there, then composite.
      ctx.restore();
      this.drawFeathered(ctx, op, frame, nested);
      return;
    }
    this.blit(ctx, op, frame, nested);
    ctx.restore();
  }

  private blit(ctx: Ctx2D, op: DrawOp, frame: Frame | null, nested: AnyCanvas | null): void {
    const { w, h } = op.rect;
    if (nested) ctx.drawImage(nested, 0, 0, w, h);
    else if (frame && !(coversCanvas(op, this.width, this.height) && frame.paintFull?.(ctx, this.width, this.height))) frame.draw(ctx, 0, 0, w, h, op.crop);
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

  private drawFeathered(ctx: Ctx2D, op: DrawOp, frame: Frame | null, nested: AnyCanvas | null): void {
    const layer = this.createCanvas(this.width, this.height);
    const lctx = layer.getContext("2d") as Ctx2D | null;
    if (!lctx) return;
    lctx.save();
    setMatrix(lctx, op.matrix);
    this.blit(lctx, op, frame, nested);
    lctx.restore();
    // Punch the mask through with a blurred alpha: draw the mask shape blurred, keep the element where it lands.
    lctx.save();
    lctx.globalCompositeOperation = "destination-in";
    lctx.filter = `blur(${op.mask!.feather}px)`;
    setMatrix(lctx, op.matrix);
    lctx.beginPath();
    traceMask(lctx, op.mask!, op.rect);
    if (op.mask!.inverted) { lctx.rect(0, 0, op.rect.w, op.rect.h); lctx.fill("evenodd"); } else lctx.fill();
    lctx.restore();
    ctx.save();
    ctx.globalAlpha = op.opacity;
    ctx.globalCompositeOperation = op.blend;
    ctx.filter = op.filter || "none";
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.drawImage(layer, 0, 0);
    ctx.restore();
  }

  private adjust(ctx: Ctx2D, op: DrawOp): void {
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
}

export function setMatrix(ctx: Ctx2D, m: Matrix2D): void {
  ctx.setTransform(m.a, m.b, m.c, m.d, m.e, m.f);
}

function canvasOf(ctx: Ctx2D): AnyCanvas {
  return ctx.canvas as AnyCanvas;
}

/** Whether a draw op puts its picture over the whole canvas as it is: no transform, crop, clip, fade, filter or blend. */
export function coversCanvas(op: DrawOp, width: number, height: number): boolean {
  const m = op.matrix;
  return m.a === 1 && m.b === 0 && m.c === 0 && m.d === 1 && m.e === 0 && m.f === 0
    && op.rect.w === width && op.rect.h === height && !op.crop
    && op.opacity >= 1 && op.blend === "source-over" && !op.filter && op.borderRadius === 0 && !op.mask;
}

/** A canvas gradient for the frame, laid out the way CSS lays out the same gradient on a box of this size. */
export function backgroundFill(ctx: Ctx2D, g: BackgroundGradient, w: number, h: number): CanvasGradient | string {
  const c = g.center ?? { x: 0.5, y: 0.5 };
  const cx = c.x * w, cy = c.y * h;
  let grad: CanvasGradient;
  if (g.type === "radial") {
    // CSS's default size: the farthest corner.
    const r = Math.max(Math.hypot(cx, cy), Math.hypot(w - cx, cy), Math.hypot(cx, h - cy), Math.hypot(w - cx, h - cy));
    grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
  } else if (g.type === "conic" && typeof (ctx as { createConicGradient?: unknown }).createConicGradient === "function") {
    grad = (ctx as unknown as { createConicGradient(a: number, x: number, y: number): CanvasGradient }).createConicGradient((((g.angle ?? 0) - 90) * Math.PI) / 180, cx, cy);
  } else {
    const rad = ((g.angle ?? 180) * Math.PI) / 180;
    const dx = Math.sin(rad), dy = -Math.cos(rad);
    // The CSS gradient line: through the centre, long enough that its ends touch the corners.
    const half = (Math.abs(w * dx) + Math.abs(h * dy)) / 2;
    grad = ctx.createLinearGradient(w / 2 - dx * half, h / 2 - dy * half, w / 2 + dx * half, h / 2 + dy * half);
  }
  for (const s of [...g.stops].sort((a, b) => a.offset - b.offset)) grad.addColorStop(Math.max(0, Math.min(1, s.offset)), withOpacity(s.color, s.opacity));
  return grad;
}

function withOpacity(color: string, opacity: number | undefined): string {
  if (opacity === undefined || opacity >= 1) return color;
  const hex = color.trim().match(/^#([0-9a-f]{3}|[0-9a-f]{6})$/i);
  if (!hex) return color;
  const h = (hex[1] as string).length === 3 ? (hex[1] as string).split("").map((x) => x + x).join("") : (hex[1] as string);
  return `rgba(${parseInt(h.slice(0, 2), 16)}, ${parseInt(h.slice(2, 4), 16)}, ${parseInt(h.slice(4, 6), 16)}, ${Math.max(0, opacity)})`;
}
