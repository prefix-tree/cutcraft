// Effects the painter draws over the element after it, on its own pixels: vignette and grain.
import { z } from "zod";

export const vignette = {
  params: z.strictObject({
    /** How dark the edges get: 0 leaves them as they were, 1 fades the corners to black. */
    amount: z.number().min(0).max(1).default(0.5),
  }),
};
export const grain = {
  params: z.strictObject({
    /** How strong the grain is: 0 is none, 1 is specks of solid black and white. */
    amount: z.number().min(0).max(1).default(0.2),
  }),
};
