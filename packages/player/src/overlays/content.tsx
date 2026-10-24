/** @jsxRuntime automatic */
/** @jsxImportSource react */
import type { Placement } from "@cutcut/kit";
import { Children, cloneElement, isValidElement, type CSSProperties, type ReactNode } from "react";
import { isVisibleAt } from "../model/visible";
import { devWarn } from "../warn";
import type { ElementProps } from "./layout";

/**
 * What each overlay element draws, as a React tree with no hooks and no DOM
 * calls. The browser mounts these inside positioned divs; the Node renderer
 * hands the same trees to Satori and draws the result with the same layout.
 */

const SUPPORTED = new Set(["none", "fade", "slide-up", "slide-down", "slide-left", "slide-right", "scale", "typewriter", "word-by-word"]);

type Fill = string | { type: "solid" | "gradient" | "none"; color?: string; opacity?: number } | undefined;

/** Text title: the file's text content with font props; entrance/exit presets as CSS transforms. */
export function titleContent(p: ElementProps & { readonly text: string }): ReactNode {
  const props = p.placement.props as Record<string, unknown>;
  const text = p.text;
  const rel = p.time - p.placement.start;
  const anim = props.animation as { preset: string; in: number; out: number } | undefined;
  const { effect, visibleChars } = animation(anim, rel, p.placement.duration, text.length, p.placement.id);
  const weight = props.weight;
  const shadow = props.shadow as { color: string; blur?: number; x?: number; y?: number } | undefined;
  const stroke = props.stroke as { color: string; width: number } | undefined;
  const inner: CSSProperties = {
    width: "100%", height: "100%", display: "flex",
    alignItems: props.valign === "top" ? "flex-start" : props.valign === "bottom" ? "flex-end" : "center",
    justifyContent: props.align === "left" ? "flex-start" : props.align === "right" ? "flex-end" : "center",
    textAlign: (props.align as CSSProperties["textAlign"]) ?? "center",
    fontFamily: String(props.font ?? "Inter"),
    fontSize: Number(props.size ?? 48),
    fontWeight: typeof weight === "number" ? weight : weight === "normal" ? 400 : 700,
    fontStyle: props.italic ? "italic" : "normal",
    color: String(props.color ?? "#ffffff"),
    lineHeight: Number(props.lineHeight ?? 1.2),
    letterSpacing: Number(props.letterSpacing ?? 0),
    textDecoration: typeof props.decoration === "string" ? props.decoration : "none",
    whiteSpace: "pre-wrap",
    ...(props.background ? { background: String(props.background) } : {}),
    ...(shadow ? { textShadow: `${shadow.x ?? 0}px ${shadow.y ?? 0}px ${shadow.blur ?? 0}px ${shadow.color}` } : {}),
    ...(stroke ? { WebkitTextStroke: `${stroke.width}px ${stroke.color}` } : {}),
    ...effect,
  };
  const shown = visibleChars === null ? text : text.slice(0, visibleChars);
  return <div style={inner}>{anim?.preset === "word-by-word" ? words(text, rel, anim, p.placement.duration) : shown}</div>;
}

function animation(anim: { preset: string; in: number; out: number } | undefined, rel: number, duration: number, chars: number, id: string): { effect: CSSProperties; visibleChars: number | null } {
  if (!anim || anim.preset === "none") return { effect: {}, visibleChars: null };
  let preset = anim.preset;
  if (!SUPPORTED.has(preset)) {
    devWarn(`title-anim:${id}:${preset}`, `text animation "${preset}" on "${id}" is shown as a fade`);
    preset = "fade";
  }
  const inP = anim.in > 0 ? Math.min(1, rel / anim.in) : 1;
  const outP = anim.out > 0 ? Math.min(1, Math.max(0, (duration - rel) / anim.out)) : 1;
  const k = Math.min(inP, outP);
  if (preset === "typewriter") return { effect: {}, visibleChars: Math.round(chars * inP) };
  if (preset === "word-by-word") return { effect: {}, visibleChars: null };
  const slide = { "slide-up": [0, 40], "slide-down": [0, -40], "slide-left": [40, 0], "slide-right": [-40, 0] }[preset];
  if (slide) return { effect: { opacity: k, transform: `translate(${slide[0]! * (1 - k)}px, ${slide[1]! * (1 - k)}px)` }, visibleChars: null };
  if (preset === "scale") return { effect: { opacity: k, transform: `scale(${0.6 + 0.4 * k})` }, visibleChars: null };
  return { effect: { opacity: k }, visibleChars: null };
}

function words(text: string, rel: number, anim: { in: number; stagger?: number }, duration: number) {
  const parts = text.split(/(\s+)/);
  const wordCount = parts.filter((w) => w.trim().length > 0).length;
  const stagger = anim.stagger ?? (wordCount > 0 ? anim.in / wordCount : 0);
  let i = 0;
  return parts.map((part, idx) => {
    if (part.trim().length === 0) return <span key={idx}>{part}</span>;
    const start = i++ * stagger;
    const shown = rel >= start && rel <= duration;
    return <span key={idx} style={{ opacity: shown ? 1 : 0 }}>{part}</span>;
  });
}

/** A vector shape as an `<svg>` in composition pixels. */
export function shapeContent(p: ElementProps): ReactNode {
  const props = p.placement.props as Record<string, unknown>;
  const w = Number(props.width ?? 200), h = Number(props.height ?? 200);
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
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} style={{ display: "block", overflow: "visible" }}>
      {geometry(String(props.shape), w, h, r, props, common)}
    </svg>
  );
}

/** The size a shape draws at, before layout. */
export function shapeSize(p: ElementProps): { width: number; height: number } {
  return { width: Number(p.placement.props.width ?? 200), height: Number(p.placement.props.height ?? 200) };
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

/** The active caption lines, positioned by the captions style; karaoke colours words by their timing. */
export function captionsContent(p: { readonly placement: Placement; readonly state: ElementProps["state"]; readonly time: number }): ReactNode {
  const props = p.placement.props as Record<string, unknown>;
  const style = (props.style ?? {}) as { font?: string; size?: number; color?: string; background?: string; position?: string; highlight?: string; upcoming?: string };
  const animation = String(props.animation ?? "none");
  // Cues are the captions' children in the file, or the ones the resolver generated from the transcript.
  const active = [...p.state.items.values()]
    .filter((c): c is Placement => c.parent === p.placement.id && c.kind === "caption" && isVisibleAt(c, p.time, p.state.composition.duration))
    .sort((a, b) => a.start - b.start);
  const comp = p.state.composition;
  const container: CSSProperties = {
    position: "absolute", left: 0, right: 0,
    ...(style.position === "top" ? { top: comp.height * 0.08 } : style.position === "center" ? { top: "50%", transform: "translateY(-50%)" } : { bottom: comp.height * 0.08 }),
    display: "flex", flexDirection: "column", alignItems: "center", gap: 8, pointerEvents: "none",
    fontFamily: style.font ?? "Inter", fontSize: style.size ?? Math.round(comp.height / 24), color: style.color ?? "#ffffff",
    textAlign: "center",
  };
  return (
    <div data-el={p.placement.id} data-kind="captions" style={container}>
      {active.map((c) => (
        <div key={c.id} data-el={c.id} data-kind="caption" style={{ padding: "0.2em 0.5em", borderRadius: 6, background: style.background ?? "rgba(0,0,0,0.6)" }}>
          {line(c, p.time, animation, style)}
        </div>
      ))}
    </div>
  );
}

function line(c: Placement, time: number, animation: string, style: { highlight?: string; upcoming?: string }) {
  const text = String(c.props.text ?? "");
  const words = c.props.words as { text: string; start: number; end: number }[] | undefined;
  if (!words || words.length === 0 || animation === "none") {
    if (animation === "typewriter" && c.duration > 0) return text.slice(0, Math.round((text.length * (time - c.start)) / c.duration));
    return text;
  }
  return words.map((w, i) => {
    const done = time >= w.end, current = time >= w.start && time < w.end;
    const color = current ? style.highlight ?? "#ffd400" : done || animation === "word-highlight" ? undefined : style.upcoming ?? "rgba(255,255,255,0.5)";
    const hidden = animation === "word-by-word" && time < w.start;
    return <span key={i} style={{ ...(color ? { color } : {}), ...(hidden ? { opacity: 0 } : {}) }}>{w.text}{i < words.length - 1 ? " " : ""}</span>;
  });
}

/** The interior as written, with the Layer's handles (edited props) applied to its one component. */
export function layerContent(interior: ReactNode, props: Readonly<Record<string, unknown>> | undefined): ReactNode {
  if (!props) return interior;
  const only = Children.toArray(interior).filter((c) => c !== null && typeof c !== "boolean" && c !== "");
  const child = only.length === 1 ? only[0] : null;
  return isValidElement(child) ? cloneElement(child, props) : interior;
}

/** The labelled box shown for a sticker with no media. */
export function stickerPlaceholder(label: string): ReactNode {
  return <div style={{ width: "100%", height: "100%", background: "#333", color: "#ccc", font: "16px monospace", display: "flex", alignItems: "center", justifyContent: "center", borderRadius: 8 }}>{label}</div>;
}

/** Side length of the box a sticker is drawn in. */
export function stickerSize(p: ElementProps): number {
  return Math.round(Math.min(p.state.composition.width, p.state.composition.height) / 4);
}
