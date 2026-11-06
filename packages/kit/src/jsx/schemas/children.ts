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
  id: idSchema,
  /** A built-in effect, or one the file declares with `defineEffect()`. */
  type: z.union([zVideoEffectType, z.string().min(1)]),
  params: paramsSchema.default({}),
  enabled: z.boolean().default(true),
});

export const colorGradeSchema = z.strictObject({
  id: idSchema,
  temperature: z.number().min(-100).max(100).optional(),
  tint: z.number().min(-100).max(100).optional(),
});

export const keyframeSchema = z
  .strictObject({
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
    value: z.unknown(),
    easing: zEasing.default("linear"),
  })
  .refine((k) => (k.property === undefined) !== (k.param === undefined), {
    message:
      "a keyframe animates a property of its parent (property) or, inside an <Effect>, a param (param): give one",
  });

export const speedKeySchema = z.strictObject({
  id: idSchema,
  at: z.number().nonnegative(),
  speed: z.number().min(0.1).max(20),
  easing: zEasing.default("linear"),
});

export const freezeSchema = z.strictObject({
  id: idSchema,
  /** Source time of the frozen frame. */
  at: z.number().nonnegative(),
  /** Element-relative start of the hold. */
  start: z.number().nonnegative(),
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
  id: idSchema,
  type: zMaskType.default("shape"),
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
  path: bezierPathSchema.optional(),
  feather: z.number().min(0).max(100).default(0),
  inverted: z.boolean().default(false),
  expansion: z.number().min(-100).max(100).default(0),
  opacity: z.number().min(0).max(1).default(1),
  easing: zMaskEasing.default("linear"),
});
