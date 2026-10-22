import { dataAttrs, overlayStyle, type ElementProps } from "./shared";

type Fill = string | { type: "solid" | "gradient" | "none"; color?: string; opacity?: number } | undefined;

/** Vector shape as inline SVG in composition pixels. */
export function Shape(p: ElementProps) {
  const props = p.placement.props as Record<string, unknown>;
  const w = Number(props.width ?? 200), h = Number(props.height ?? 200);
  const style = overlayStyle(p, { width: w, height: h });
  const fill = props.fill as Fill;
  const fillColor = typeof fill === "string" ? fill : fill?.type === "none" ? "none" : fill?.color ?? "#ffffff";
  const fillOpacity = typeof fill === "object" && fill?.opacity !== undefined ? fill.opacity : 1;
  const stroke = props.stroke as { color: string; width: number; opacity?: number; dashArray?: number[] } | undefined;
  const common = {
    fill: fillColor, fillOpacity,
    ...(stroke ? { stroke: stroke.color, strokeWidth: stroke.width, strokeOpacity: stroke.opacity ?? 1, strokeDasharray: stroke.dashArray?.join(" ") } : {}),
  };
  const r = Number(props.cornerRadius ?? 0);
  return (
    <div {...dataAttrs(p.placement)} style={style}>
      <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} style={{ display: "block", overflow: "visible" }}>
        {geometry(String(props.shape), w, h, r, props, common)}
      </svg>
    </div>
  );
}

function geometry(shape: string, w: number, h: number, r: number, props: Record<string, unknown>, common: Record<string, unknown>) {
  switch (shape) {
    case "circle": return <circle cx={w / 2} cy={h / 2} r={Math.min(w, h) / 2} {...common} />;
    case "ellipse": return <ellipse cx={w / 2} cy={h / 2} rx={w / 2} ry={h / 2} {...common} />;
    case "triangle": return <polygon points={`${w / 2},0 ${w},${h} 0,${h}`} {...common} />;
    case "line": return <line x1={0} y1={h / 2} x2={w} y2={h / 2} stroke={String(common.stroke ?? common.fill)} strokeWidth={Number(common.strokeWidth ?? 4)} />;
    case "arrow": {
      const head = Math.min(h, w * 0.3);
      return <polygon points={`0,${h * 0.35} ${w - head},${h * 0.35} ${w - head},0 ${w},${h / 2} ${w - head},${h} ${w - head},${h * 0.65} 0,${h * 0.65}`} {...common} />;
    }
    case "polygon": {
      const pts = (props.points as { x: number; y: number }[] | undefined) ?? [];
      return <polygon points={pts.map((q) => `${q.x * w},${q.y * h}`).join(" ")} {...common} />;
    }
    case "star": {
      const n = Number(props.starPoints ?? 5), inner = Number(props.innerRadius ?? 0.5);
      const R = Math.min(w, h) / 2, cx = w / 2, cy = h / 2;
      const pts: string[] = [];
      for (let i = 0; i < n * 2; i++) {
        const rad = i % 2 === 0 ? R : R * inner;
        const a = -Math.PI / 2 + (i * Math.PI) / n;
        pts.push(`${cx + rad * Math.cos(a)},${cy + rad * Math.sin(a)}`);
      }
      return <polygon points={pts.join(" ")} {...common} />;
    }
    case "path": {
      const pts = (props.points as { x: number; y: number }[] | undefined) ?? [];
      const d = pts.map((q, i) => `${i === 0 ? "M" : "L"}${q.x * w} ${q.y * h}`).join(" ");
      return <path d={d} {...common} />;
    }
    default: return <rect x={0} y={0} width={w} height={h} rx={r} ry={r} {...common} />;
  }
}
