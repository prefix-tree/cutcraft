import { dataAttrs, type ElementProps } from "../../overlays/layout";

/**
 * The painter's adjustment op filters the footage; overlays stay unfiltered, as in the export.
 * A backdrop filter here would filter the canvas a second time.
 */
export function Adjustment(p: ElementProps) {
  return <div {...dataAttrs(p.placement)} style={{ position: "absolute", inset: 0, pointerEvents: "none" }} />;
}
