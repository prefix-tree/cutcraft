import { dataAttrs, layoutStyle, type ElementProps } from "../../overlays/layout";
import { shapeDrawing } from "../../overlays/shape";
import { devWarn } from "../../warn";

/** A vector shape, drawn from the same markup as the export, with room around it for its stroke and shadows. */
export function Shape(p: ElementProps) {
  const d = shapeDrawing(p);
  for (const w of d.prepared.warnings) devWarn(`shape:${p.placement.id}:${w}`, `shape "${p.placement.id}": ${w}`);
  return (
    <div {...dataAttrs(p.placement)} style={layoutStyle(d.layout)}>
      {/* biome-ignore lint/security/noDangerouslySetInnerHtml: prepareSvg (overlays/svg.ts) parses the markup and drops scripts, foreignObject, frames and event handlers. */}
      <div style={{ position: "absolute", left: -d.bleed, top: -d.bleed, lineHeight: 0 }} dangerouslySetInnerHTML={{ __html: d.prepared.markup }} />
    </div>
  );
}
