import { shapeContent, shapeSize } from "../../overlays/content";
import { dataAttrs, overlayStyle, type ElementProps } from "../../overlays/layout";

/** Vector shape as inline SVG in composition pixels. */
export function Shape(p: ElementProps) {
  return <div {...dataAttrs(p.placement)} style={overlayStyle(p, shapeSize(p))}>{shapeContent(p)}</div>;
}
