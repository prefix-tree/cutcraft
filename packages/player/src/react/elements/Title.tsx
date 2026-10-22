import type { CSSProperties } from "react";
import { devWarn } from "../../warn";
import { dataAttrs, overlayStyle, type ElementProps } from "./shared";

const SUPPORTED = new Set(["none", "fade", "slide-up", "slide-down", "slide-left", "slide-right", "scale", "typewriter", "word-by-word"]);

/** Text title: the file's text content with font props; entrance/exit presets as CSS transforms. */
export function Title(p: ElementProps) {
  const props = p.placement.props as Record<string, unknown>;
  const text = p.state.tree.byId.get(p.placement.id)?.text ?? "";
  const comp = p.state.composition;
  const box = { width: comp.width, height: comp.height };
  const style = overlayStyle(p, box);
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
  return (
    <div {...dataAttrs(p.placement)} style={style}>
      <div style={inner}>{anim?.preset === "word-by-word" ? words(text, rel, anim, p.placement.duration) : shown}</div>
    </div>
  );
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
