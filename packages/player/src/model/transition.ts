import { type ClipRect, effect } from "./motion";
import type { TransitionRole } from "./visible";

/** What a transition does to one side of it at one moment, in a `W`×`H` box. */
export interface TransitionLook {
  readonly opacity: number;
  /** A shift in the box's pixels (slide, push). */
  readonly offset?: { readonly x: number; readonly y: number };
  /** The part shown (wipe), in the box's pixels. */
  readonly clip?: readonly ClipRect[];
  /** How far the picture is dipped to black or white (0..1); set on one side only, so it is drawn once. */
  readonly dip?: number;
}

const DIRECTION: Readonly<Record<string, readonly [number, number]>> = {
  left: [-1, 0],
  right: [1, 0],
  up: [0, -1],
  down: [0, 1],
};

/**
 * One side of a transition at its eased progress. Between two clips the
 * incoming one goes over the outgoing one, which stays put unless the
 * transition moves it; an edge transition plays its side against what is beneath.
 * Types without a look of their own draw as a crossfade.
 */
export function transitionLook(t: TransitionRole, W: number, H: number): TransitionLook {
  const x = t.placement,
    p = t.progress,
    role = t.role,
    between = x.between !== undefined;
  const type = String(x.props.type ?? "crossfade");
  const params = (x.props.params ?? {}) as Record<string, unknown>;
  const dir = DIRECTION[String(params.direction)] ?? DIRECTION.left!;
  switch (type) {
    case "dipToBlack":
    case "dipToWhite": {
      if (!between) return { opacity: 1, dip: role === "in" ? 1 - p : p };
      if (role === "out") return { opacity: 1 };
      // A triangle that holds at full for `holdDuration` around the midpoint.
      const hold = x.duration > 0 ? Math.max(0, Math.min(1, Number(params.holdDuration ?? 0.1) / x.duration)) : 1;
      const ramp = (1 - hold) / 2;
      const dip = ramp <= 0 ? 1 : Math.min(1, p / ramp, (1 - p) / ramp);
      return { opacity: p >= 0.5 ? 1 : 0, dip };
    }
    case "wipe": {
      if (role === "out" && between) return { opacity: 1 };
      // shortcut: a diagonal wipe draws as a left wipe and softness is ignored (the not-rendered lint says so); a path clip would do both.
      const name = `wipe-${params.direction === "diagonal" || params.direction === undefined ? "left" : String(params.direction)}`;
      return {
        opacity: 1,
        clip: effect({ type: name, easing: "linear" }, role === "in" ? p : 1 - p, W, H).clip ?? [
          { x: 0, y: 0, w: W, h: H },
        ],
      };
    }
    case "slide":
    case "push": {
      if (role === "in") return { opacity: 1, offset: { x: -dir[0] * W * (1 - p), y: -dir[1] * H * (1 - p) } };
      if (between && type === "slide" && params.pushOut !== true) return { opacity: 1 };
      return { opacity: 1, offset: { x: dir[0] * W * p, y: dir[1] * H * p } };
    }
    default:
      return { opacity: role === "in" ? p : between ? 1 : 1 - p };
  }
}
