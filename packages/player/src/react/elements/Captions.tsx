import type { Placement, ResolvedState } from "@cutcraft/kit";

import { captionsContent } from "../../overlays/content";

export interface CaptionsProps {
  readonly placement: Placement;
  readonly state: ResolvedState;
  readonly time: number;
}

/** The active caption lines, positioned by the captions style; karaoke colours words by their timing. */
export function Captions(p: CaptionsProps) {
  return captionsContent(p);
}
