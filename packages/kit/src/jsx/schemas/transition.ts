import { z } from "zod";

import { TRANSITION_TYPES, type TransitionType, zTransitionType } from "../enums";
import { idSchema } from "./common";

const dir4 = z.enum(["left", "right", "up", "down"]);

/** Per-type parameter schemas, with defaults that validate. */
export const TRANSITION_PARAMS: Readonly<Record<TransitionType, z.ZodType>> = {
  crossfade: z.strictObject({
    curve: z.enum(["linear", "ease", "ease-in", "ease-out", "ease-in-out"]).default("ease"),
  }),
  dipToBlack: z.strictObject({ holdDuration: z.number().min(0).max(30).default(0.1) }),
  dipToWhite: z.strictObject({ holdDuration: z.number().min(0).max(30).default(0.1) }),
  wipe: z.strictObject({
    direction: dir4.default("left"),
  }),
  slide: z.strictObject({ direction: dir4.default("left"), pushOut: z.boolean().default(false) }),
  push: z.strictObject({ direction: dir4.default("left") }),
};

export const transitionSchema = z
  .strictObject({
    id: idSchema,
    /** A built-in transition, or one the file declares with `defineTransition()`. */
    type: z.union([zTransitionType, z.string().min(1)]).default("crossfade"),
    duration: z.number().min(0.001).max(30).default(0.5),
    params: z.record(z.string(), z.unknown()).default({}),
    /** Edge form: a transition at one edge of a single clip. Omit for a transition between two siblings. */
    on: idSchema.optional(),
    edge: z.enum(["in", "out"]).optional(),
  })
  .refine((v) => (v.on === undefined) === (v.edge === undefined), { message: "on and edge go together" })
  .superRefine((v, ctx) => {
    // A transition the file declares is checked against its own params schema when the file resolves.
    if (!isBuiltInTransition(v.type)) return;
    const result = TRANSITION_PARAMS[v.type].safeParse(v.params);
    if (!result.success) {
      ctx.addIssue({
        code: "custom",
        path: ["params"],
        message: `invalid params for ${v.type}: ${result.error.message}`,
      });
    }
  });

export function isBuiltInTransition(type: string): type is TransitionType {
  return (TRANSITION_TYPES as readonly string[]).includes(type);
}

export function defaultTransitionParams(type: TransitionType): Record<string, unknown> {
  return TRANSITION_PARAMS[type].parse({}) as Record<string, unknown>;
}

export const ALL_TRANSITION_TYPES = TRANSITION_TYPES;
