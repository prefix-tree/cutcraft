import { z } from "zod";

import { MASK_TYPES, SVG_COLOR_TYPES, TEXT_ALIGNS, TEXT_DECORATIONS, TEXT_VALIGNS } from "../enums";

export const zTextAlign = z.enum(TEXT_ALIGNS);
export const zTextValign = z.enum(TEXT_VALIGNS);
export const zTextDecoration = z.enum(TEXT_DECORATIONS);
export const zMaskType = z.enum(MASK_TYPES);
export const zSvgColorType = z.enum(SVG_COLOR_TYPES);
