import { z } from "zod";
import { zTransitionType } from "../jsx/enums";
import { colorSchema, graphicAnimationSchema } from "../jsx/schemas/common";
import { MOTION_NAMES, THEME_NAMES } from "./builtins";

/** A whole prop value naming a theme value: `$primary`, `$heading`, `$radius`. */
export const TOKEN_PATTERN = /^\$([A-Za-z][A-Za-z0-9_-]*)$/;
export const tokenSchema = z.string().regex(TOKEN_PATTERN, 'theme tokens look like "$primary"');

/** Element kinds a theme can hold named presets for; their elements pick one with `style`. */
export const STYLED_KINDS = ["title", "shape", "svg", "sticker", "graphic", "captions"] as const;
export type StyledKind = (typeof STYLED_KINDS)[number];

const nameSchema = z.string().regex(/^[A-Za-z][A-Za-z0-9_-]*$/, "names are identifiers: letters, digits, _ and -");

export const motionStyleSchema = z.strictObject({
  enter: graphicAnimationSchema.optional(),
  exit: graphicAnimationSchema.optional(),
  transition: z
    .strictObject({ type: zTransitionType.optional(), duration: z.number().min(0.001).max(30).optional() })
    .optional(),
});

export const themeSchema = z
  .strictObject({
    /** The built-in theme this one starts from; omitted, the default (midnight). */
    extends: z.enum(THEME_NAMES).optional(),
    /** Colours by name, used as `$name`. Merged over the base theme's palette. */
    palette: z.record(nameSchema, colorSchema).optional(),
    /** Font families by role, used as `$heading`, `$body`, `$mono`. */
    fonts: z.record(nameSchema, z.string().min(1)).optional(),
    /** Corner radius in pixels, used as `$radius`. */
    radius: z.number().nonnegative().optional(),
    /** A named motion style, or what to fill: default entrance, exit and transition. */
    motion: z.union([z.enum(MOTION_NAMES), motionStyleSchema]).optional(),
    /** Named presets per element kind; an element picks one with `style`, and `default` applies to those that pick none. */
    styles: z.partialRecord(z.enum(STYLED_KINDS), z.record(nameSchema, z.record(z.string(), z.unknown()))).optional(),
  })
  .superRefine((theme, ctx) => {
    for (const name of Object.keys(theme.fonts ?? {})) {
      if (theme.palette && name in theme.palette)
        ctx.addIssue({
          code: "custom",
          path: ["fonts", name],
          message: `"${name}" is a palette colour too; tokens share one namespace`,
        });
    }
    if (theme.palette && "radius" in theme.palette)
      ctx.addIssue({
        code: "custom",
        path: ["palette", "radius"],
        message: '"radius" is reserved for the corner radius',
      });
  });

export type ThemeInput = z.input<typeof themeSchema>;
export type ThemeProps = z.output<typeof themeSchema>;
