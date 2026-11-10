// The resolved timeline as flat rows: one array per kind of thing, each row with its id, its seconds and its frames.
// Flat rows are what jq, a short script or a SQL table take as they are.
import type { ResolveError } from "../resolve/errors";
import type { Placement, ResolvedState } from "../resolve/resolve";
import { spokenWords } from "./plays";

export interface ElementRow {
  readonly id: string;
  readonly kind: string;
  readonly track: string | null;
  readonly parent: string | null;
  readonly start: number;
  readonly end: number;
  readonly duration: number;
  readonly startFrame: number;
  /** The first frame after the element. */
  readonly endFrame: number;
  /** The asset it plays and the range of it, in the asset's own seconds. */
  readonly asset?: string;
  readonly in?: number;
  readonly out?: number;
  readonly speed?: number;
  /** A title's or a caption's words. */
  readonly text?: string;
  /** What it is placed against: `anchor`, `at` and `offset` as the file writes them. */
  readonly anchor?: string;
  readonly at?: string | number;
  readonly offset?: number;
  /** A transition's type and the two clips it joins. */
  readonly type?: string;
  readonly from?: string;
  readonly to?: string;
  /** A marker's label. */
  readonly label?: string;
}

export interface EffectRow {
  readonly id: string;
  readonly element: string;
  readonly type: string;
  readonly params: Readonly<Record<string, unknown>>;
  /** Its place among the element's effects, which run in this order. */
  readonly order: number;
}

export interface KeyframeRow {
  readonly id: string;
  /** The element or effect it animates. */
  readonly element: string;
  readonly property: string;
  /** Seconds of the finished video. */
  readonly at: number;
  readonly frame: number;
  readonly value: unknown;
  readonly easing?: string;
}

export interface WordRow {
  readonly asset: string;
  readonly clip: string;
  readonly i: number;
  readonly text: string;
  readonly start: number;
  readonly end: number;
  readonly startFrame: number;
}

export interface CutRow {
  readonly time: number;
  readonly frame: number;
  readonly track: string;
  readonly from: string;
  readonly to: string;
  /** The transition over the cut, when there is one; `time` is then where it starts. */
  readonly transition?: string;
}

export interface TimelineRows {
  readonly composition: {
    readonly id: string;
    readonly fps: number;
    readonly width: number;
    readonly height: number;
    readonly duration: number;
    readonly frames: number;
  };
  readonly tracks: readonly {
    readonly id: string;
    readonly layout: string;
    readonly order: number;
    readonly hidden: boolean;
    readonly muted: boolean;
    readonly solo: boolean;
    readonly locked: boolean;
  }[];
  readonly elements: readonly ElementRow[];
  readonly effects: readonly EffectRow[];
  readonly keyframes: readonly KeyframeRow[];
  readonly words: readonly WordRow[];
  readonly cuts: readonly CutRow[];
  readonly errors: readonly ResolveError[];
}

/** Children of an element that are rows of their own, or that only shape its timing. */
const NOT_ELEMENTS = new Set([
  "composition",
  "track",
  "effect",
  "keyframe",
  "speedKey",
  "freeze",
  "mask",
  "angle",
  "cut",
]);

const ms = (x: number): number => Math.round(x * 1000) / 1000 + 0;

/** The flat rows of a resolved timeline. */
export function timelineRows(state: ResolvedState): TimelineRows {
  const { fps } = state.composition;
  const frame = (t: number): number => Math.round(t * fps + 1e-6);
  const elements: ElementRow[] = [];
  const effects: EffectRow[] = [];
  const keyframes: KeyframeRow[] = [];
  const order = new Map<string, number>();

  for (const p of state.items.values()) {
    if (p.kind === "effect") {
      const n = order.get(p.parent ?? "") ?? 0;
      order.set(p.parent ?? "", n + 1);
      effects.push({
        id: p.id,
        element: p.parent ?? "",
        type: typeof p.props.type === "string" ? p.props.type : shaderName(p.props.type),
        params: (p.props.params ?? {}) as Record<string, unknown>,
        order: n,
      });
    } else if (p.kind === "keyframe") {
      keyframes.push({
        id: p.id,
        element: p.parent ?? "",
        property: String(p.props.property ?? ""),
        at: ms(p.start),
        frame: frame(p.start),
        value: p.props.value,
        ...(typeof p.props.easing === "string" ? { easing: p.props.easing } : {}),
      });
    } else if (!NOT_ELEMENTS.has(p.kind)) {
      elements.push(elementRow(state, p, frame));
    }
  }
  elements.sort((a, b) => a.start - b.start);

  const cuts: CutRow[] = [];
  for (const track of state.tracks) {
    if (track.layout !== "sequence") continue;
    const clips = track.items
      .map((id) => state.items.get(id))
      .filter(
        (p): p is Placement => p !== undefined && (p.kind === "clip" || p.kind === "audio" || p.kind === "nested"),
      );
    const transitions = [...state.items.values()].filter((p) => p.kind === "transition" && p.track === track.id);
    for (let i = 0; i + 1 < clips.length; i++) {
      const a = clips[i] as Placement,
        b = clips[i + 1] as Placement;
      // Clips with a gap between them do not cut to each other; overlays on a track are placed, not cut.
      if (b.start > a.end + 1e-6) continue;
      const over = transitions.find((t) => t.between?.[0] === a.id && t.between[1] === b.id);
      cuts.push({
        time: ms(b.start),
        frame: frame(b.start),
        track: track.id,
        from: a.id,
        to: b.id,
        ...(over ? { transition: over.id } : {}),
      });
    }
  }
  cuts.sort((a, b) => a.time - b.time);

  return {
    composition: {
      ...state.composition,
      duration: ms(state.composition.duration),
      frames: Math.round(state.composition.duration * fps),
    },
    tracks: state.tracks.map((t) => ({
      id: t.id,
      layout: t.layout,
      order: t.order,
      hidden: t.hidden,
      muted: t.muted,
      solo: t.solo,
      locked: t.locked,
    })),
    elements,
    effects,
    keyframes: keyframes.sort((a, b) => a.at - b.at),
    words: spokenWords(state).map((w) => ({
      asset: w.asset,
      clip: w.play,
      i: w.i,
      text: w.text,
      start: w.start,
      end: w.end,
      startFrame: frame(w.start),
    })),
    cuts,
    errors: state.errors,
  };
}

function elementRow(state: ResolvedState, p: Placement, frame: (t: number) => number): ElementRow {
  const props = p.props;
  // A title's words are the element's children, kept on its node; a caption's are a prop.
  const text = p.kind === "title" ? state.tree.byId.get(p.id)?.text : p.kind === "caption" ? props.text : undefined;
  return {
    id: p.id,
    kind: p.kind,
    track: p.track,
    parent: p.parent,
    start: ms(p.start),
    end: ms(p.end),
    duration: ms(p.end - p.start),
    startFrame: frame(p.start),
    endFrame: frame(p.end),
    ...(p.source ? { asset: p.source.asset, in: ms(p.source.in), out: ms(p.source.out), speed: p.source.speed } : {}),
    ...(typeof text === "string" && text.length > 0 ? { text } : {}),
    ...(typeof props.anchor === "string" ? { anchor: props.anchor } : {}),
    ...(typeof props.at === "string" || (typeof props.at === "number" && p.kind !== "marker") ? { at: props.at } : {}),
    ...(typeof props.offset === "number" ? { offset: props.offset } : {}),
    ...(p.kind === "transition" && typeof props.type === "string" ? { type: props.type } : {}),
    ...(p.kind === "transition" && typeof props.type !== "string" ? { type: shaderName(props.type) } : {}),
    ...(p.between ? { from: p.between[0], to: p.between[1] } : {}),
    ...(typeof props.label === "string" ? { label: props.label } : {}),
  };
}

/** The name of an effect or transition the file declares itself. */
function shaderName(type: unknown): string {
  const name = (type as { name?: unknown } | null)?.name;
  return typeof name === "string" ? name : "custom";
}
