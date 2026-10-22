import { z } from "zod";
import { zBlendMode, zEasing, zGraphicAnimation, zShapeType, zTextAnimationPreset } from "../enums";
import { zAnimationUnit, zSvgColorMode, zTextAlign, zTextDecoration, zTextValign } from "./enums-local";
import {
  assetRefSchema, colorSchema, gradientSchema, idSchema, shadowSchema, timedProps, timeRefSchema,
  transformSchema, vec2Schema, visualProps,
} from "./common";

export const textAnimationSchema = z.strictObject({
  preset: zTextAnimationPreset,
  in: z.number().nonnegative().default(0.5),
  out: z.number().nonnegative().default(0.5),
  stagger: z.number().nonnegative().optional(),
  unit: zAnimationUnit.optional(),
  params: z.record(z.string(), z.union([z.number(), z.string(), z.boolean(), z.strictObject({ start: z.number(), end: z.number() })])).optional(),
});

export const text3dSchema = z.strictObject({
  enabled: z.boolean().default(true),
  depth: z.number().nonnegative().default(10),
  bevelThickness: z.number().nonnegative().optional(),
  bevelSize: z.number().nonnegative().optional(),
  bevelSegments: z.number().int().nonnegative().optional(),
  frontColor: colorSchema.optional(),
  sideColor: colorSchema.optional(),
  metalness: z.number().min(0).max(1).optional(),
  roughness: z.number().min(0).max(1).optional(),
  material: z.enum(["basic", "physical"]).optional(),
});

export const titleSchema = z.strictObject({
  ...timedProps,
  ...visualProps,
  style: idSchema.optional(),
  font: z.string().default("Inter"),
  size: z.number().min(1).max(1000).default(48),
  weight: z.union([z.number().int().min(100).max(900).multipleOf(100), z.enum(["normal", "bold"])]).default("bold"),
  italic: z.boolean().default(false),
  color: colorSchema.default("#ffffff"),
  background: colorSchema.optional(),
  stroke: z.strictObject({ color: colorSchema, width: z.number().min(0).max(100) }).optional(),
  shadow: shadowSchema.optional(),
  align: zTextAlign.default("center"),
  valign: zTextValign.default("middle"),
  lineHeight: z.number().min(0.1).max(10).default(1.2),
  letterSpacing: z.number().min(-100).max(100).default(0),
  decoration: zTextDecoration.optional(),
  animation: textAnimationSchema.optional(),
  text3d: text3dSchema.optional(),
  behindSubject: z.boolean().default(false),
});

const fillSchema = z.union([
  colorSchema,
  z.strictObject({
    type: z.enum(["solid", "gradient", "none"]),
    color: colorSchema.optional(),
    gradient: gradientSchema.optional(),
    opacity: z.number().min(0).max(1).optional(),
  }),
]);

const strokeSchema = z.strictObject({
  color: colorSchema,
  width: z.number().nonnegative(),
  opacity: z.number().min(0).max(1).optional(),
  dashArray: z.array(z.number().nonnegative()).optional(),
  dashOffset: z.number().optional(),
  lineCap: z.enum(["butt", "round", "square"]).optional(),
  lineJoin: z.enum(["miter", "round", "bevel"]).optional(),
  gradient: gradientSchema.optional(),
});

export const shapeSchema = z.strictObject({
  ...timedProps,
  ...visualProps,
  shape: zShapeType,
  width: z.number().positive().optional(),
  height: z.number().positive().optional(),
  points: z.array(vec2Schema).optional(),
  fill: fillSchema.optional(),
  stroke: strokeSchema.optional(),
  shadow: shadowSchema.optional(),
  shadows: z.array(shadowSchema).optional(),
  cornerRadius: z.number().nonnegative().optional(),
  cornerRadii: z.strictObject({ topLeft: z.number(), topRight: z.number(), bottomRight: z.number(), bottomLeft: z.number() }).optional(),
  starPoints: z.number().int().min(3).optional(),
  innerRadius: z.number().min(0).max(1).optional(),
});

const graphicAnimationSchema = z.strictObject({
  type: zGraphicAnimation,
  duration: z.number().positive().default(0.5),
  easing: zEasing.default("ease-out"),
});

export const svgSchema = z.strictObject({
  ...timedProps,
  ...visualProps,
  src: assetRefSchema.optional(),
  content: z.string().optional(),
  viewBox: z.strictObject({ minX: z.number(), minY: z.number(), width: z.number().positive(), height: z.number().positive() }).optional(),
  preserveAspectRatio: z.string().optional(),
  color: z.strictObject({ mode: zSvgColorMode, tint: colorSchema.optional(), opacity: z.number().min(0).max(1).optional() }).optional(),
  enter: graphicAnimationSchema.optional(),
  exit: graphicAnimationSchema.optional(),
}).refine((v) => Boolean(v.src) !== Boolean(v.content), { message: "Svg takes either src or content" });

export const stickerSchema = z.strictObject({
  ...timedProps,
  ...visualProps,
  src: z.string().min(1),
  category: z.string().optional(),
  name: z.string().optional(),
});

export const adjustmentSchema = z.strictObject({
  ...timedProps,
  affects: z.union([z.literal("all"), z.array(idSchema).min(1)]).default("all"),
  opacity: z.number().min(0).max(1).default(1),
  blend: zBlendMode.default("normal"),
  enabled: z.boolean().default(true),
  transform: transformSchema.optional(),
});

export const nestedSchema = z.strictObject({
  ...timedProps,
  ...visualProps,
  /** A pure helper component returning tracks, or a file reference. Validated at collect time. */
  of: z.union([z.custom<(props: Record<string, unknown>) => unknown>((v) => typeof v === "function"), z.string().startsWith("file:")]),
  in: timeRefSchema.optional(),
  out: timeRefSchema.optional(),
  volume: z.number().min(0).max(4).default(1),
});

export const layerSchema = z.strictObject({
  ...timedProps,
  transform: transformSchema.optional(),
  blend: zBlendMode.optional(),
});
