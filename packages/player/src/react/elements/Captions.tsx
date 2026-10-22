import type { Placement, ResolvedState } from "@cut/kit";
import type { CSSProperties } from "react";
import { isVisibleAt } from "../../model/visible";

export interface CaptionsProps {
  readonly placement: Placement;
  readonly state: ResolvedState;
  readonly time: number;
}

/** The active caption lines, positioned by the captions style; karaoke colours words by their timing. */
export function Captions(p: CaptionsProps) {
  const props = p.placement.props as Record<string, unknown>;
  const style = (props.style ?? {}) as { font?: string; size?: number; color?: string; background?: string; position?: string; highlight?: string; upcoming?: string };
  const animation = String(props.animation ?? "none");
  const active = p.placement.children
    .map((id) => p.state.items.get(id))
    .filter((c): c is Placement => c !== undefined && c.kind === "caption" && isVisibleAt(c, p.time, p.state.composition.duration));
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
