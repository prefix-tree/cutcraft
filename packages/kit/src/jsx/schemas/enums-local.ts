import { z } from "zod";

import {
  AUTOMATION_LANES,
  CAPTION_POSITIONS,
  MASK_TYPES,
  SVG_COLOR_MODES,
  TEXT_ALIGNS,
  TEXT_DECORATIONS,
  TEXT_VALIGNS,
} from "../enums";

export const zCaptionPosition = z.enum(CAPTION_POSITIONS);
export const zTextAlign = z.enum(TEXT_ALIGNS);
export const zTextValign = z.enum(TEXT_VALIGNS);
export const zTextDecoration = z.enum(TEXT_DECORATIONS);
export const zMaskType = z.enum(MASK_TYPES);
export const zSvgColorMode = z.enum(SVG_COLOR_MODES);
export const zAutomationLane = z.enum(AUTOMATION_LANES);
