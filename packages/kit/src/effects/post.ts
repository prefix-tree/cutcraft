// Effects the painter draws over the element after it, on its own pixels: vignette and grain.
import { z } from "zod";

export const vignette = { params: z.strictObject({ amount: z.number().min(0).max(100).default(50) }) };
export const grain = { params: z.strictObject({ amount: z.number().min(0).max(100).default(20) }) };
