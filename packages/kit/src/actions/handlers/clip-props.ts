import { define, makePropHandler, rawNode, rawProp, validateTarget } from "../handler-kit";
import { INTERIOR_PREFIX } from "../../resolve/tree";
import { invalid, nodeSpecOf, ok, type NodeSpec } from "../types";
import { replaceAll, stackPosition } from "./effect";
import type { Json } from "../../patches/types";

const SOURCE_KINDS = ["clip", "audio", "nested"];
const VISUAL_KINDS = ["clip", "title", "shape", "svg", "sticker", "graphic", "nested", "layer", "adjustment"];
const AUDIO_KINDS = ["clip", "audio", "nested"];

/** Speed always recomputes the timeline length; `out` stays, so nothing else changes in the file. */
define(makePropHandler({
  type: "clip/setSpeed",
  kinds: SOURCE_KINDS,
  write: (p) => ({ speed: p.speed }),
  validate: (a) =>
    a.params.speed >= 0.1 && a.params.speed <= 20
      ? ok
      : invalid({ code: "OUT_OF_BOUNDS", message: "speed is 0.1..20" }),
}));
define(makePropHandler({ type: "clip/setReverse", kinds: SOURCE_KINDS, write: (p) => ({ reverse: p.value }) }));
define(makePropHandler({
  type: "clip/setPitchCorrection",
  kinds: SOURCE_KINDS,
  write: (p) => ({ pitchCorrection: p.value }),
}));
define(makePropHandler({ type: "clip/setSmoothSlowMo", kinds: ["clip"], write: (p) => ({ smoothSlowMo: p.value }) }));
define(makePropHandler({ type: "clip/setStabilization", kinds: ["clip"], write: (p) => ({ stabilize: p.value }) }));
define(makePropHandler({ type: "clip/setChromaKey", kinds: ["clip"], write: (p) => ({ chromaKey: p.value }) }));
define(makePropHandler({
  type: "clip/setBlend",
  kinds: VISUAL_KINDS,
  write: (p) => ({
    ...(p.mode !== undefined ? { blend: p.mode } : {}),
    ...(p.opacity !== undefined ? { blendOpacity: p.opacity } : {}),
  }),
}));
define(makePropHandler({ type: "clip/setEmphasis", kinds: VISUAL_KINDS, write: (p) => ({ emphasis: p.value }) }));
define(makePropHandler({ type: "clip/setFit", kinds: ["clip", "nested"], write: (p) => ({ fit: p.value }) }));
define(makePropHandler({
  type: "clip/setSource",
  kinds: ["clip", "audio", "svg", "sticker"],
  write: (p) => ({ src: p.src }),
}));
define(makePropHandler({
  type: "clip/setAnchor",
  // A word `at` names belongs to the anchor's footage: anchoring elsewhere drops it.
  write: (p, state) => ({
    anchor: p.anchor,
    offset: p.anchor === undefined ? undefined : (p.offset ?? 0),
    ...(p.anchor !== rawProp(state, p.id, "anchor") ? { at: undefined } : {}),
  }),
  validate: (a, state) =>
    a.params.anchor === undefined || a.params.anchor === "start" || state.items.has(a.params.anchor)
      ? ok
      : invalid({ code: "ELEMENT_NOT_FOUND", message: `anchor "${a.params.anchor}" does not exist`, path: "anchor" }),
}));

define(makePropHandler({
  type: "transform/update",
  kinds: VISUAL_KINDS,
  write: (p, state) => ({
    transform: deepMerge((rawProp(state, p.id, "transform") ?? {}) as Record<string, Json>, p.transform),
  }),
}));

define(makePropHandler({
  type: "layer/setTransform",
  kinds: ["layer"],
  write: (p, state) => ({
    transform: deepMerge((rawProp(state, p.id, "transform") ?? {}) as Record<string, Json>, p.transform),
  }),
}));
/** The handles of a Layer: the literal or schema-bound props of the one component inside it. */
define(makePropHandler({
  type: "layer/setProps",
  kinds: ["layer"],
  write: (p) => Object.fromEntries(Object.entries(p.props).map(([k, v]) => [`${INTERIOR_PREFIX}${k}`, v])),
  validate: (a, state) =>
    rawNode(state, a.params.id)?.interior
      ? ok
      : invalid({
          code: "INVALID_PARAMS",
          message: `"${a.params.id}" has no handles: a Layer gets them from the one component inside it`,
        }),
}));

define(makePropHandler({
  type: "layer/setTiming",
  kinds: ["layer"],
  write: (p, state) => ({
    ...("duration" in p ? { duration: p.duration } : {}),
    ...("anchor" in p ? { anchor: p.anchor } : {}),
    ...("offset" in p ? { offset: p.offset } : {}),
    ...("start" in p ? { start: p.start } : {}),
    ...("anchor" in p && p.anchor !== rawProp(state, p.id, "anchor") ? { at: undefined } : {}),
  }),
}));

define(makePropHandler({
  type: "audio/setVolume",
  kinds: AUDIO_KINDS,
  write: (p) => ({ volume: p.volume }),
  validate: (a) =>
    a.params.volume >= 0 && a.params.volume <= 4 ? ok : invalid({ code: "OUT_OF_BOUNDS", message: "volume is 0..4" }),
}));
define(makePropHandler({
  type: "audio/setFade",
  kinds: AUDIO_KINDS,
  write: (p, state) => {
    const prior = (rawProp(state, p.id, "fade") ?? {}) as Record<string, Json>;
    return {
      fade: { ...prior, ...(p.in !== undefined ? { in: p.in } : {}), ...(p.out !== undefined ? { out: p.out } : {}) },
    };
  },
}));
define(makePropHandler({
  type: "audio/setAutomation",
  kinds: AUDIO_KINDS,
  write: (p, state) => {
    const prior = (rawProp(state, p.id, "automation") ?? {}) as Record<string, Json>;
    return { automation: { ...prior, [p.lane]: p.points.map((pt) => [pt[0], pt[1]]) } };
  },
}));
define(makePropHandler({
  type: "audio/setDuck",
  kinds: AUDIO_KINDS,
  write: (p) => ({ duck: p.duck as Json | undefined }),
  validate: (a, state) =>
    a.params.duck === undefined || state.tracks.some((t) => t.id === a.params.duck?.under)
      ? ok
      : invalid({ code: "ELEMENT_NOT_FOUND", message: "duck.under must be a track id", path: "duck.under" }),
}));

/** Replace the whole child collection of one kind. */
function replaceChildren(
  type: "speed/setKeys" | "speed/setFreezes",
  childKind: string,
  pick: (p: { keys?: readonly NodeSpec[]; freezes?: readonly NodeSpec[] }) => readonly NodeSpec[],
) {
  define({
    type,
    validate: (a, state) => validateTarget(state, a.params.id, []),
    apply: (a, log, ctx) =>
      replaceAll(log, ctx.before, a.params.id, childKind, pick(a.params as never), a.params.after),
    invert: (a, before) => {
      const node = before.tree.byId.get(a.params.id)!;
      const prior = node.children.filter((c) => c.kind === childKind).map(nodeSpecOf);
      const after = stackPosition(before, a.params.id, childKind);
      return {
        type,
        params:
          type === "speed/setKeys"
            ? { id: a.params.id, keys: prior, after }
            : { id: a.params.id, freezes: prior, after },
      } as never;
    },
    fold: () => [],
  });
}
replaceChildren("speed/setKeys", "speedKey", (p) => p.keys ?? []);
replaceChildren("speed/setFreezes", "freeze", (p) => p.freezes ?? []);

export function deepMerge(base: Record<string, Json>, patch: Readonly<Record<string, Json>>): Record<string, Json> {
  const out: Record<string, Json> = { ...base };
  for (const [k, v] of Object.entries(patch)) {
    const prev = out[k];
    if (v && typeof v === "object" && !Array.isArray(v) && prev && typeof prev === "object" && !Array.isArray(prev)) {
      out[k] = deepMerge(prev as Record<string, Json>, v as Record<string, Json>);
    } else {
      out[k] = v;
    }
  }
  return out;
}
