import { z } from "zod";
import { TRANSITION_TYPES, type TransitionType, zTransitionType } from "../enums";
import { idSchema, vec2Schema } from "./common";

const dir4 = z.enum(["left", "right", "up", "down"]);
const center = vec2Schema.default({ x: 0.5, y: 0.5 });

/** Per-type parameter schemas with OpenReel's engine defaults, so defaults validate. */
export const TRANSITION_PARAMS: Readonly<Record<TransitionType, z.ZodType>> = {
  crossfade: z.strictObject({ curve: z.enum(["linear", "ease", "ease-in", "ease-out", "ease-in-out"]).default("ease") }),
  dipToBlack: z.strictObject({ holdDuration: z.number().min(0).max(30).default(0.1) }),
  dipToWhite: z.strictObject({ holdDuration: z.number().min(0).max(30).default(0.1) }),
  wipe: z.strictObject({ direction: z.enum(["left", "right", "up", "down", "diagonal"]).default("left"), softness: z.number().min(0).max(1).default(0) }),
  slide: z.strictObject({ direction: dir4.default("left"), pushOut: z.boolean().default(false) }),
  zoom: z.strictObject({ scale: z.number().min(0.01).max(100).default(2), center }),
  push: z.strictObject({ direction: dir4.default("left") }),
  circleReveal: z.strictObject({ center }),
  blur: z.strictObject({ intensity: z.number().min(0).max(10).default(1) }),
  whipPan: z.strictObject({ direction: dir4.default("left"), blurIntensity: z.number().min(0).max(100).default(1) }),
  radialWipe: z.strictObject({ startAngle: z.number().min(-360).max(360).default(-90), clockwise: z.boolean().default(true) }),
  pixelate: z.strictObject({ maxPixelSize: z.number().min(1).max(1000).default(48) }),
  glitch: z.strictObject({ intensity: z.number().min(0).max(10).default(0.08), slices: z.number().int().min(1).max(100).default(12) }),
  blinds: z.strictObject({ count: z.number().int().min(1).max(100).default(8), direction: z.enum(["vertical", "horizontal"]).default("vertical") }),
  diamondReveal: z.strictObject({ center }),
  spin: z.strictObject({ rotations: z.number().min(-20).max(20).default(1) }),
  flip: z.strictObject({ axis: z.enum(["horizontal", "vertical"]).default("horizontal") }),
  splitReveal: z.strictObject({ orientation: z.enum(["horizontal", "vertical"]).default("horizontal") }),
  flash: z.strictObject({ intensity: z.number().min(0).max(10).default(1) }),
  filmBurn: z.strictObject({ intensity: z.number().min(0).max(10).default(1), warmth: z.number().min(0).max(1).default(0.75) }),
  mosaic: z.strictObject({ tiles: z.number().int().min(1).max(100).default(8), randomness: z.number().min(0).max(1).default(0.85) }),
  ripple: z.strictObject({ amplitude: z.number().min(0).max(1).default(0.04), waves: z.number().min(0).max(100).default(3) }),
  pageTurn: z.strictObject({ direction: z.enum(["left", "right"]).default("left"), shadow: z.number().min(0).max(1).default(0.55) }),
  colorSplit: z.strictObject({ maxOffset: z.number().min(0).max(1000).default(18), angle: z.number().min(-360).max(360).default(0) }),
};

export const transitionSchema = z.strictObject({
  id: idSchema,
  type: zTransitionType.default("crossfade"),
  duration: z.number().min(0.001).max(30).default(0.5),
  params: z.record(z.string(), z.unknown()).default({}),
  /** Edge form: a transition at one edge of a single clip. Omit for a transition between two siblings. */
  on: idSchema.optional(),
  edge: z.enum(["in", "out"]).optional(),
})
  .refine((v) => (v.on === undefined) === (v.edge === undefined), { message: "on and edge go together" })
  .superRefine((v, ctx) => {
    const result = TRANSITION_PARAMS[v.type].safeParse(v.params);
    if (!result.success) {
      ctx.addIssue({ code: "custom", path: ["params"], message: `invalid params for ${v.type}: ${result.error.message}` });
    }
  });

export function defaultTransitionParams(type: TransitionType): Record<string, unknown> {
  return TRANSITION_PARAMS[type].parse({}) as Record<string, unknown>;
}

export const ALL_TRANSITION_TYPES = TRANSITION_TYPES;
