import { graphicDrawing, graphicLabels } from "../../overlays/graphic";
import { dataAttrs, layoutStyle, type ElementProps } from "../../overlays/layout";
import { devWarn } from "../../warn";

/** A built-in graphic: the kind's art from the same markup as the export, its labels as text above it. */
export function Graphic(p: ElementProps) {
  const d = graphicDrawing(p);
  for (const w of d.prepared.warnings) devWarn(`graphic:${p.placement.id}:${w}`, `graphic "${p.placement.id}": ${w}`);
  return (
    <div {...dataAttrs(p.placement)} style={layoutStyle(d.layout)}>
      <div style={{ position: "absolute", left: 0, top: 0, lineHeight: 0 }} dangerouslySetInnerHTML={{ __html: d.prepared.markup }} />
      {graphicLabels(d.labels)}
    </div>
  );
}
