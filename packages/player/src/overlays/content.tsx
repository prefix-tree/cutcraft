/** @jsxRuntime automatic */
/** @jsxImportSource react */

import { Children, type CSSProperties, cloneElement, isValidElement, type ReactNode } from "react";

import { type Placement, RENDERED_TITLE_ANIMATIONS } from "@cutcraft/kit";

import { isVisibleAt } from "../model/visible";
import { devWarn } from "../warn";
import type { ElementProps } from "./layout";

/**
 * What each overlay element draws, as a React tree with no hooks and no DOM
 * calls. The browser mounts these inside positioned divs; the Node renderer
 * hands the same trees to Satori and draws the result with the same layout.
 */

const SUPPORTED: ReadonlySet<string> = new Set(RENDERED_TITLE_ANIMATIONS);

/** A title's box: its width and height props, the whole frame when left out. */
export function titleBox(
  props: Readonly<Record<string, unknown>>,
  comp: { width: number; height: number },
): { width: number; height: number } {
  return {
    width: typeof props.width === "number" ? props.width : comp.width,
    height: typeof props.height === "number" ? props.height : comp.height,
  };
}

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
    width: "100%",
    height: "100%",
    display: "flex",
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
    <div style={inner}>{anim?.preset === "word-by-word" ? words(text, rel, anim, p.placement.duration) : shown}</div>
  );
}

function animation(
  anim: { preset: string; in: number; out: number } | undefined,
  rel: number,
  duration: number,
  chars: number,
  id: string,
): { effect: CSSProperties; visibleChars: number | null } {
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
  if (slide)
    return {
      effect: { opacity: k, transform: `translate(${slide[0]! * (1 - k)}px, ${slide[1]! * (1 - k)}px)` },
      visibleChars: null,
    };
  if (preset === "scale") return { effect: { opacity: k, transform: `scale(${0.6 + 0.4 * k})` }, visibleChars: null };
  return { effect: { opacity: k }, visibleChars: null };
}

function words(text: string, rel: number, anim: { in: number; stagger?: number }, duration: number) {
  const parts = text.split(/(\s+)/);
  const wordCount = parts.filter((w) => w.trim().length > 0).length;
  const stagger = anim.stagger ?? (wordCount > 0 ? anim.in / wordCount : 0);
  let i = 0;
  return parts.map((part, idx) => {
    if (part.trim().length === 0)
      return (
        <span
          // biome-ignore lint/suspicious/noArrayIndexKey: the parts of one fixed string, never reordered.
          key={idx}
        >
          {part}
        </span>
      );
    const start = i++ * stagger;
    const shown = rel >= start && rel <= duration;
    return (
      <span
        // biome-ignore lint/suspicious/noArrayIndexKey: the parts of one fixed string, never reordered.
        key={idx}
        style={{ opacity: shown ? 1 : 0 }}
      >
        {part}
      </span>
    );
  });
}

/** The active caption lines, positioned by the captions style; karaoke colours words by their timing. */
export function captionsContent(p: {
  readonly placement: Placement;
  readonly state: ElementProps["state"];
  readonly time: number;
}): ReactNode {
  const props = p.placement.props as Record<string, unknown>;
  const style = (props.style ?? {}) as {
    font?: string;
    size?: number;
    weight?: number | string;
    color?: string;
    background?: string;
    shadow?: { color: string; blur?: number; x?: number; y?: number };
    stroke?: { color: string; width: number };
    position?: string;
    highlight?: string;
    upcoming?: string;
  };
  const animation = String(props.animation ?? "none");
  // Cues are the captions' children in the file, or the ones the resolver generated from the transcript.
  const active = [...p.state.items.values()]
    .filter(
      (c): c is Placement =>
        c.parent === p.placement.id && c.kind === "caption" && isVisibleAt(c, p.time, p.state.composition.duration),
    )
    .sort((a, b) => a.start - b.start);
  const comp = p.state.composition;
  // Vertical video: the platform's own UI covers the bottom fifth and the right edge, so captions sit above it.
  const portrait = comp.height > comp.width;
  // Without a shadow of its own, a tight dark halo under a soft drop: it reads as an outline on a white shirt or sky.
  const shadow = style.shadow
    ? `${style.shadow.x ?? 0}px ${style.shadow.y ?? 0}px ${style.shadow.blur ?? 0}px ${style.shadow.color}`
    : "0 0 3px rgba(0,0,0,0.9), 0 0 8px rgba(0,0,0,0.55), 0 2px 14px rgba(0,0,0,0.75)";
  const container: CSSProperties = {
    position: "absolute",
    left: 0,
    right: 0,
    padding: portrait ? "0 12%" : "0 8%",
    ...(style.position === "top"
      ? { top: comp.height * 0.08 }
      : style.position === "center"
        ? { top: "50%", transform: "translateY(-50%)" }
        : { bottom: comp.height * (portrait ? 0.2 : 0.08) }),
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: 8,
    pointerEvents: "none",
    fontFamily: style.font ?? "Inter",
    fontSize: style.size ?? Math.round(comp.height / 24),
    color: style.color ?? "#ffffff",
    fontWeight: style.weight === "normal" ? 400 : style.weight === "bold" ? 700 : Number(style.weight ?? 800),
    textShadow: shadow,
    // The outline is painted under the letters, so it does not eat into them.
    ...(style.stroke
      ? { WebkitTextStroke: `${style.stroke.width}px ${style.stroke.color}`, paintOrder: "stroke fill" }
      : {}),
    textAlign: "center",
    lineHeight: 1.15,
  };
  return (
    <div data-el={p.placement.id} data-kind="captions" style={container}>
      {active.map((c) => (
        <div
          key={c.id}
          data-el={c.id}
          data-kind="caption"
          style={
            {
              padding: "0.2em 0.5em",
              borderRadius: 6,
              textWrap: "balance",
              ...(style.background ? { background: style.background } : {}),
            } as CSSProperties
          }
        >
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
    if (animation === "typewriter" && c.duration > 0)
      return text.slice(0, Math.round((text.length * (time - c.start)) / c.duration));
    return text;
  }
  return words.map((w, i) => {
    const done = time >= w.end,
      current = time >= w.start && time < w.end;
    const color = current
      ? (style.highlight ?? "#ffd400")
      : done || animation === "word-highlight"
        ? undefined
        : (style.upcoming ?? "rgba(255,255,255,0.5)");
    const hidden = animation === "word-by-word" && time < w.start;
    return (
      <span
        // biome-ignore lint/suspicious/noArrayIndexKey: a caption's words in time order, never reordered.
        key={i}
        style={{ ...(color ? { color } : {}), ...(hidden ? { opacity: 0 } : {}) }}
      >
        {w.text}
        {i < words.length - 1 ? " " : ""}
      </span>
    );
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
  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        background: "#333",
        color: "#ccc",
        font: "16px monospace",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        borderRadius: 8,
      }}
    >
      {label}
    </div>
  );
}

/** Side length of the box a sticker is drawn in. */
export function stickerSize(p: ElementProps): number {
  return Math.round(Math.min(p.state.composition.width, p.state.composition.height) / 4);
}
