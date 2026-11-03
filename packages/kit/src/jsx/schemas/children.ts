import { z } from "zod";
import { zAudioEffectType, zEasing, zKeyframeProperty, zMaskEasing, zVideoEffectType } from "../enums";
import { zMaskType, zMatteChannel } from "./enums-local";
import { idSchema, vec2Schema } from "./common";

const paramValue = z.union([
  z.number(),
  z.string(),
  z.boolean(),
  z.array(z.number()),
  z.record(z.string(), z.number()),
]);
export const paramsSchema = z.record(z.string(), paramValue);

export const effectSchema = z.strictObject({
  id: idSchema,
  type: zVideoEffectType,
  params: paramsSchema.default({}),
  enabled: z.boolean().default(true),
});

export const audioEffectSchema = z.strictObject({
  id: idSchema,
  type: zAudioEffectType,
  params: paramsSchema.default({}),
  enabled: z.boolean().default(true),
});

const rgb = z.strictObject({
  r: z.number().min(-1).max(1),
  g: z.number().min(-1).max(1),
  b: z.number().min(-1).max(1),
});
const curve = z.array(vec2Schema).min(2);
const eightBands = z.array(z.number()).length(8);

export const colorGradeSchema = z.strictObject({
  id: idSchema,
  wheels: z
    .strictObject({
      shadows: rgb.optional(),
      midtones: rgb.optional(),
      highlights: rgb.optional(),
      shadowsLift: z.number().min(-1).max(1).optional(),
      midtonesGamma: z.number().min(0.1).max(4).optional(),
      highlightsGain: z.number().min(0).max(4).optional(),
    })
    .optional(),
  curves: z
    .strictObject({ rgb: curve.optional(), red: curve.optional(), green: curve.optional(), blue: curve.optional() })
    .optional(),
  lut: z.strictObject({ src: z.string(), intensity: z.number().min(0).max(1).default(1) }).optional(),
  hsl: z
    .strictObject({ hue: eightBands.optional(), saturation: eightBands.optional(), luminance: eightBands.optional() })
    .optional(),
  temperature: z.number().min(-100).max(100).optional(),
  tint: z.number().min(-100).max(100).optional(),
});

export const keyframeSchema = z.strictObject({
  id: idSchema,
  property: zKeyframeProperty,
  /** Element-relative seconds. */
  at: z.number().nonnegative(),
  value: z.unknown(),
  easing: zEasing.default("linear"),
  handles: z.strictObject({ in: vec2Schema, out: vec2Schema }).optional(),
  roving: z.boolean().optional(),
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
  matte: z.strictObject({ source: idSchema, channel: zMatteChannel.default("bounds") }).optional(),
});
