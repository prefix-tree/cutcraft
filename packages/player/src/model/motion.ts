import { ease } from "./keyframes";
import { IDENTITY, type Matrix2D, multiply, rotate, scaleM, translate } from "./transform";

/** An entrance or exit as the schema writes it. */
export interface GraphicAnimation {
  readonly type: string;
  readonly duration?: number;
  readonly easing?: string;
}

/** A rectangle in the element's own pixels. */
export interface ClipRect {
  readonly x: number;
  readonly y: number;
  readonly w: number;
  readonly h: number;
}

/**
 * What an element's entrance and exit do to it at one moment, in its own pixels:
 * an opacity factor, a matrix applied before its layout, the part of it shown
 * (null for all of it) and how much of its strokes are drawn (null when not drawing).
 */
export interface Motion {
  readonly opacity: number;
  readonly matrix: Matrix2D;
  readonly clip: readonly ClipRect[] | null;
  readonly draw: number | null;
}

export const STILL: Motion = { opacity: 1, matrix: IDENTITY, clip: null, draw: null };

const DEFAULT_DURATION = 0.5;
/** How far a slide travels: a quarter of the element's size, at most this many pixels (a title's box is the frame). */
const SLIDE = 0.25;
const SLIDE_MAX = 160;

/**
 * The entrance and exit of an element `rel` seconds into its `duration`, for a
 * `width` by `height` box. Both can play at once on a short element; their
 * effects multiply. Pop, bounce and elastic carry their own curve; the others
 * follow the animation's easing (default ease-out).
 */
export function motionAt(
  enter: GraphicAnimation | undefined,
  exit: GraphicAnimation | undefined,
  rel: number,
  duration: number,
  width: number,
  height: number,
): Motion {
  if (!enter && !exit) return STILL;
  let m: Motion = STILL;
  if (enter && enter.type !== "none") {
    const len = enter.duration ?? DEFAULT_DURATION;
    m = combine(m, effect(enter, len > 0 ? rel / len : 1, width, height));
  }
  if (exit && exit.type !== "none") {
    const len = exit.duration ?? DEFAULT_DURATION;
    m = combine(m, effect(exit, len > 0 ? (duration - rel) / len : 1, width, height));
  }
  return m;
}

/** One animation at raw progress `x` (0 hidden, 1 fully shown). */
export function effect(anim: GraphicAnimation, x: number, w: number, h: number): Motion {
  const raw = Math.max(0, Math.min(1, x));
  if (raw >= 1) return STILL;
  const k = ease(anim.easing ?? "ease-out", raw);
  const about = (m: Matrix2D): Matrix2D => multiply(multiply(translate(w / 2, h / 2), m), translate(-w / 2, -h / 2));
  const fadeIn = Math.min(1, raw * 3);
  switch (anim.type) {
    case "fade":
      return { ...STILL, opacity: k };
    case "slide-left":
      return { ...STILL, opacity: k, matrix: translate(Math.min(w * SLIDE, SLIDE_MAX) * (1 - k), 0) };
    case "slide-right":
      return { ...STILL, opacity: k, matrix: translate(-Math.min(w * SLIDE, SLIDE_MAX) * (1 - k), 0) };
    case "slide-up":
      return { ...STILL, opacity: k, matrix: translate(0, Math.min(h * SLIDE, SLIDE_MAX) * (1 - k)) };
    case "slide-down":
      return { ...STILL, opacity: k, matrix: translate(0, -Math.min(h * SLIDE, SLIDE_MAX) * (1 - k)) };
    case "scale":
      return { ...STILL, opacity: k, matrix: about(scaleM(0.6 + 0.4 * k, 0.6 + 0.4 * k)) };
    case "rotate":
      return {
        ...STILL,
        opacity: k,
        matrix: about(multiply(rotate(-90 * (1 - k)), scaleM(0.8 + 0.2 * k, 0.8 + 0.2 * k))),
      };
    case "pop": {
      const s = ease("easeOutBack", raw);
      return { ...STILL, opacity: fadeIn, matrix: about(scaleM(s, s)) };
    }
    case "bounce": {
      const s = ease("easeOutBounce", raw);
      return { ...STILL, opacity: fadeIn, matrix: about(scaleM(s, s)) };
    }
    case "elastic": {
      const s = ease("easeOutElastic", raw);
      return { ...STILL, opacity: fadeIn, matrix: about(scaleM(s, s)) };
    }
    case "flip-horizontal":
      return { ...STILL, matrix: about(scaleM(Math.max(0.001, Math.sin((k * Math.PI) / 2)), 1)) };
    case "flip-vertical":
      return { ...STILL, matrix: about(scaleM(1, Math.max(0.001, Math.sin((k * Math.PI) / 2)))) };
    case "wipe-right":
      return { ...STILL, clip: [{ x: 0, y: 0, w: w * k, h }] };
    case "wipe-left":
      return { ...STILL, clip: [{ x: w * (1 - k), y: 0, w: w * k, h }] };
    case "wipe-down":
      return { ...STILL, clip: [{ x: 0, y: 0, w, h: h * k }] };
    case "wipe-up":
      return { ...STILL, clip: [{ x: 0, y: h * (1 - k), w, h: h * k }] };
    case "reveal-center":
      return { ...STILL, clip: [{ x: (w * (1 - k)) / 2, y: (h * (1 - k)) / 2, w: w * k, h: h * k }] };
    case "reveal-edges":
      return {
        ...STILL,
        clip: [
          { x: 0, y: 0, w: (w * k) / 2, h },
          { x: w - (w * k) / 2, y: 0, w: (w * k) / 2, h },
        ],
      };
    case "draw":
      return { ...STILL, draw: k };
    default:
      return { ...STILL, opacity: k };
  }
}

/** Both effects at once: opacities and draw amounts multiply, matrices compose, clips intersect. */
export function combine(a: Motion, b: Motion): Motion {
  if (b === STILL) return a;
  if (a === STILL) return b;
  return {
    opacity: a.opacity * b.opacity,
    matrix: multiply(a.matrix, b.matrix),
    clip: a.clip && b.clip ? intersect(a.clip, b.clip) : (a.clip ?? b.clip),
    draw: a.draw !== null && b.draw !== null ? a.draw * b.draw : (a.draw ?? b.draw),
  };
}

function intersect(a: readonly ClipRect[], b: readonly ClipRect[]): ClipRect[] {
  const out: ClipRect[] = [];
  for (const r of a)
    for (const s of b) {
      const x = Math.max(r.x, s.x),
        y = Math.max(r.y, s.y);
      const x2 = Math.min(r.x + r.w, s.x + s.w),
        y2 = Math.min(r.y + r.h, s.y + s.h);
      if (x2 > x && y2 > y) out.push({ x, y, w: x2 - x, h: y2 - y });
    }
  return out;
}
