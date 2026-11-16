import { z } from "zod";

import { zEasing, zKeyframeProperty, zMaskEasing, zVideoEffectType } from "../enums";
import { idSchema, vec2Schema } from "./common";
import { zMaskType } from "./enums-local";

const paramValue = z.union([
  z.number(),
  z.string(),
  z.boolean(),
  z.array(z.number()),
  // A list of points, as `curves` takes.
  z.array(z.array(z.number())),
  z.record(z.string(), z.number()),
]);
export const paramsSchema = z.record(z.string(), paramValue);

export const effectSchema = z.strictObject({
  /** The effect's name. */
  id: idSchema,
  /** A built-in effect, or one the file declares with `effect()`. */
  type: z.union([zVideoEffectType, z.string().min(1)]),
  /** The type's own settings; each effect's page lists them. */
  params: paramsSchema.default({}),
  /** Off, it draws nothing and stays in the file. */
  enabled: z.boolean().default(true),
});

export const keyframeSchema = z
  .strictObject({
    /** The keyframe's name. */
    id: idSchema,
    /** A property of the parent element (`transform.opacity`…). */
    property: zKeyframeProperty.optional(),
    /** Inside an `<Effect>`: the effect param it animates. */
    param: z
      .string()
      .regex(/^[A-Za-z_]\w*$/, "a param is a name: letters, digits and _")
      .optional(),
    /** Element-relative seconds. */
    at: z.number().nonnegative(),
    /** The value the property or param has at `at`. */
    value: z.unknown(),
    /** How it moves from the keyframe before to this one. */
    easing: zEasing.default("linear"),
  })
  .refine((k) => (k.property === undefined) !== (k.param === undefined), {
    message:
      "a keyframe animates a property of its parent (property) or, inside an <Effect>, a param (param): give one",
  });

export const speedKeySchema = z.strictObject({
  /** The key's name. */
  id: idSchema,
  /** Seconds into the clip where the new speed is reached. */
  at: z.number().nonnegative(),
  /** The playback rate from here on: 2 is twice as fast. */
  speed: z.number().min(0.1).max(20),
  /** How the speed changes from the key before to this one. */
  easing: zEasing.default("linear"),
});

export const freezeSchema = z.strictObject({
  /** The freeze's name. */
  id: idSchema,
  /** Source time of the frozen frame. */
  at: z.number().nonnegative(),
  /** Element-relative start of the hold. */
  start: z.number().nonnegative(),
  /** Seconds the frame is held before the clip plays on. */
  duration: z.number().positive(),
});

const bezierPathSchema = z.strictObject({
  points: z
    .array(
      z.strictObject({
        x: z.number(),
        y: z.number(),
        handleIn: vec2Schema.optional(),
        handleOut: vec2Schema.optional(),
      }),
    )
    .min(2),
  closed: z.boolean().default(true),
});

export const maskSchema = z.strictObject({
  /** The mask's name. */
  id: idSchema,
  /** `shape` for a rectangle, ellipse or polygon; `drawn` for a bezier `path`. */
  type: zMaskType.default("shape"),
  /** The region it shows: `{ rect }`, `{ ellipse }` or `{ polygon }`, in the clip's pixels. */
  shape: z
    .union([
      z.strictObject({
        rect: z.strictObject({
          x: z.number(),
          y: z.number(),
          width: z.number().positive(),
          height: z.number().positive(),
          cornerRadius: z.number().nonnegative().optional(),
        }),
      }),
      z.strictObject({
        ellipse: z.strictObject({
          cx: z.number(),
          cy: z.number(),
          rx: z.number().positive(),
          ry: z.number().positive(),
        }),
      }),
      z.strictObject({ polygon: z.array(vec2Schema).min(3) }),
    ])
    .optional(),
  /** A drawn mask's outline: bezier points with handles, closed or open. */
  path: bezierPathSchema.optional(),
  /** Softens the mask's edge, in pixels. */
  feather: z.number().min(0).max(100).default(0),
  /** Shows everything outside the region instead of inside. */
  inverted: z.boolean().default(false),
  /** Grows the region outwards, or shrinks it when negative, in pixels. */
  expansion: z.number().min(-100).max(100).default(0),
  /** How much the mask hides: 1 hides fully outside the region, 0 not at all. */
  opacity: z.number().min(0).max(1).default(1),
  /** How the mask moves between its keyframes. */
  easing: zMaskEasing.default("linear"),
});
