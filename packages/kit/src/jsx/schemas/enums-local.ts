import { z } from "zod";

import {
  ANIMATION_UNITS,
  AUTOMATION_LANES,
  CAPTION_POSITIONS,
  INTERPOLATION_QUALITIES,
  MASK_TYPES,
  MATTE_CHANNELS,
  STABILIZE_CROP_MODES,
  SVG_COLOR_MODES,
  TEXT_ALIGNS,
  TEXT_DECORATIONS,
  TEXT_VALIGNS,
} from "../enums";

export const zInterpolation = z.enum(INTERPOLATION_QUALITIES);
export const zStabilizeCrop = z.enum(STABILIZE_CROP_MODES);
export const zCaptionPosition = z.enum(CAPTION_POSITIONS);
export const zTextAlign = z.enum(TEXT_ALIGNS);
export const zTextValign = z.enum(TEXT_VALIGNS);
export const zTextDecoration = z.enum(TEXT_DECORATIONS);
export const zAnimationUnit = z.enum(ANIMATION_UNITS);
export const zMaskType = z.enum(MASK_TYPES);
export const zMatteChannel = z.enum(MATTE_CHANNELS);
export const zSvgColorMode = z.enum(SVG_COLOR_MODES);
export const zAutomationLane = z.enum(AUTOMATION_LANES);
