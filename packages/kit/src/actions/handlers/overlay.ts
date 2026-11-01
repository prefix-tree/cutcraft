import { capabilitiesOf } from "../../jsx/capabilities";
import { define, insertNode, isError, placeNode, placementOf, rawNode, rawProp, requireElement, requireUnlocked, setProps, siblingAfter, uniqueId, validateTarget } from "../handler-kit";
import { invalid, nodeSpecOf, ok, type ActionInput, type ActionType, type NodeSpec, type PlacementSpec } from "../types";
import type { Json } from "../../patches/types";
import type { Placement, ResolvedState } from "../../resolve/resolve";
import { resolveScene, type SceneFn } from "../../resolve/scene";

const EPS = 1e-6;
/** Nested props that re-time or re-draw the scene as a whole; the extracted elements could not carry them. */
const EXTRACT_BLOCKERS = ["in", "out", "transform", "fit", "blend", "blendOpacity", "emphasis"] as const;

const KIND_OF_NS: Record<string, string> = { text: "title", shape: "shape", svg: "svg", sticker: "sticker", graphic: "graphic", adjustment: "adjustment", nested: "nested" };

function overlayHandlers(ns: keyof typeof KIND_OF_NS) {
  const kind = KIND_OF_NS[ns] as string;
  const t = (n: string) => `${ns}/${n}` as ActionType;
  define({
    type: t("create") as "text/create",
    validate: (a, state) => {
      if (state.tree.byId.has(a.params.id)) return invalid({ code: "DUPLICATE_ID", message: `"${a.params.id}" exists` });
      const track = state.tracks.find((tr) => tr.id === a.params.trackId);
      if (!track) return invalid({ code: "ELEMENT_NOT_FOUND", message: `track "${a.params.trackId}" does not exist`, path: "trackId" });
      if (track.locked) return invalid({ code: "TRACK_LOCKED", message: "track is locked" });
      const place: PlacementSpec = a.params.place;
      if ("start" in place && track.layout !== "free") return invalid({ code: "UNSUPPORTED_ON_LAYOUT", message: "start needs a free track" });
      if ("after" in place && track.layout !== "sequence") return invalid({ code: "UNSUPPORTED_ON_LAYOUT", message: "after needs a sequence track" });
      if ("anchor" in place && place.anchor !== "start" && !state.items.has(place.anchor.replace(/\.end$/, ""))) return invalid({ code: "ELEMENT_NOT_FOUND", message: `anchor "${place.anchor}" does not exist` });
      return ok;
    },
    apply: (a, log, ctx) => placeNode(log, ctx.before, a.params.trackId, a.params.place, {
      id: a.params.id, kind, props: { ...a.params.props, id: a.params.id },
      ...(a.params.text !== undefined ? { text: a.params.text } : {}),
      children: a.params.children ?? [],
    }, a.params.after),
    invert: (a) => ({ type: t("remove") as "text/remove", params: { id: a.params.id } }),
    fold: () => [],
  });
  define({
    type: t("update") as "text/update",
    validate: (a, state) => {
      const base = validateTarget(state, a.params.id, Object.keys(a.params.props));
      if (!base.valid) return base;
      return state.items.get(a.params.id)!.kind === kind ? ok : invalid({ code: "INVALID_PARAMS", message: `"${a.params.id}" is not a <${kind}>` });
    },
    apply: (a, log) => setProps(log, a.params.id, a.params.props),
    invert: (a, before) => {
      const prior: Record<string, Json | undefined> = {};
      for (const prop of Object.keys(a.params.props)) prior[prop] = rawProp(before, a.params.id, prop);
      return { type: "source/setProps", params: { id: a.params.id, props: prior } };
    },
    fold: () => [],
  });
  define({
    type: t("remove") as "text/remove",
    validate: (a, state) => {
      const item = requireElement(state, a.params.id);
      if (isError(item)) return invalid(item);
      const locked = requireUnlocked(state, item);
      if (locked) return invalid(locked);
      return item.kind === kind ? ok : invalid({ code: "INVALID_PARAMS", message: `"${a.params.id}" is not a <${kind}>` });
    },
    apply: (a, log) => log.append({ op: "remove", id: a.params.id }),
    invert: (a, before) => {
      const node = rawNode(before, a.params.id)!;
      const spec = nodeSpecOf(node);
      const { id: _id, start: _s, anchor: _an, offset: _o, ...rest } = spec.props;
      return { type: t("create") as "text/create", params: { id: a.params.id, kind, trackId: node.parent as string, place: placementOf(before, a.params.id), props: rest, ...(spec.text !== undefined ? { text: spec.text } : {}), children: spec.children ?? [], after: siblingAfter(before, a.params.id) } };
    },
    fold: () => [],
  });
}

for (const ns of Object.keys(KIND_OF_NS)) overlayHandlers(ns as keyof typeof KIND_OF_NS);

define({
  type: "text/setContent",
  validate: (a, state) => {
    const base = validateTarget(state, a.params.id, []);
    if (!base.valid) return base;
    return state.items.get(a.params.id)!.kind === "title" ? ok : invalid({ code: "INVALID_PARAMS", message: "only titles have text content" });
  },
  apply: (a, log) => log.append({ op: "text", id: a.params.id, text: a.params.text }),
  invert: (a, before) => ({ type: "text/setContent", params: { id: a.params.id, text: rawNode(before, a.params.id)?.text ?? "" } }),
  fold: () => [],
});

/**
 * Write the scene's tracks into the file: one free track per inner track,
 * inserted after the nested element's track, every item at the time it
 * played. On a sequence track a <Gap> keeps the slot so later items stay put.
 */
define({
  type: "nested/extract",
  validate: (a, state) => {
    const base = validateTarget(state, a.params.id, []);
    if (!base.valid) return base;
    const item = state.items.get(a.params.id) as Placement;
    if (item.kind !== "nested") return invalid({ code: "INVALID_PARAMS", message: `"${a.params.id}" is not a <Nested>` });
    const node = rawNode(state, a.params.id)!;
    if (typeof node.props.of !== "function") return invalid({ code: "INVALID_PARAMS", message: "only a scene given as a function can be extracted" });
    const blocker = EXTRACT_BLOCKERS.find((p) => node.props[p] !== undefined);
    if (blocker) return invalid({ code: "INVALID_PARAMS", message: `"${a.params.id}.${blocker}" would re-time or re-draw the scene; remove it before extracting` });
    const scene = sceneOf(state, item);
    if (scene.errors.length > 0) return invalid({ code: "INVALID_PARAMS", message: `the scene has ${scene.errors[0]?.code}; fix it before extracting` });
    if (scene.tracks.length === 0) return invalid({ code: "INVALID_PARAMS", message: "the scene has no tracks" });
    const unsupported = scene.tracks.flatMap((t) => t.items).map((id) => scene.items.get(id)).find((p) => p && (p.kind === "transition" || p.kind === "multicam"));
    if (unsupported) return invalid({ code: "INVALID_PARAMS", message: `the scene's <${unsupported.kind}> "${unsupported.id}" cannot be extracted yet` });
    return ok;
  },
  apply: (a, log, ctx) => {
    const state = ctx.before;
    const trackId = rawNode(state, a.params.id)?.parent as string;
    const plan = extractionPlan(state, a.params.id);
    let after = trackId;
    for (const track of plan.tracks) {
      insertNode(log, state.tree.root.id, after, track);
      after = track.id;
    }
    if (plan.gap) insertNode(log, trackId, siblingAfter(state, a.params.id), plan.gap);
    log.append({ op: "remove", id: a.params.id });
  },
  invert: (a, before) => {
    const node = rawNode(before, a.params.id)!;
    const plan = extractionPlan(before, a.params.id);
    const spec = nodeSpecOf(node);
    const { id: _id, start: _s, anchor: _an, offset: _o, ...rest } = spec.props;
    return [
      ...plan.tracks.map((t): ActionInput => ({ type: "track/remove", params: { trackId: t.id } })),
      ...(plan.gap ? [{ type: "clip/remove", params: { id: plan.gap.id } } as ActionInput] : []),
      { type: "nested/create", params: { id: a.params.id, kind: "nested", trackId: node.parent as string, place: placementOf(before, a.params.id), props: rest, children: spec.children ?? [], after: siblingAfter(before, a.params.id) } },
    ];
  },
  fold: () => [],
});

function sceneOf(state: ResolvedState, item: Placement): ResolvedState {
  return resolveScene(item.props.of as SceneFn, item.props, state.composition, state.manifest);
}

function extractionPlan(state: ResolvedState, id: string): { tracks: NodeSpec[]; gap: NodeSpec | null } {
  const item = state.items.get(id) as Placement;
  const node = rawNode(state, id)!;
  const scene = sceneOf(state, item);
  const volume = Number(item.props.volume ?? 1);
  const taken = new Set<string>();
  const fresh = (base: string): string => {
    const v = uniqueId(state, base, taken);
    taken.add(v);
    return v;
  };
  const prefixed = (spec: NodeSpec): NodeSpec => {
    const nid = fresh(`${id}-${spec.id}`);
    return { ...spec, id: nid, props: { ...spec.props, id: nid }, children: (spec.children ?? []).map(prefixed) };
  };
  const tracks: NodeSpec[] = [];
  for (const track of scene.tracks) {
    const trackId = fresh(`${id}-${track.id}`);
    const raw = scene.tree.byId.get(track.id);
    const children: NodeSpec[] = [];
    for (const childId of track.items) {
      const p = scene.items.get(childId);
      const rn = scene.tree.byId.get(childId);
      if (!p || !rn || p.kind === "gap") continue;
      const start = item.start + p.start;
      if (start >= item.end - EPS) continue;
      const limit = item.end - start;
      const spec = prefixed(nodeSpecOf(rn));
      const props: Record<string, Json | undefined> = { ...spec.props, anchor: undefined, offset: undefined, at: undefined, start };
      if (p.duration > limit + EPS) {
        if (p.source) { props.in = p.source.in; props.out = p.source.in + limit * p.source.speed; props.duration = undefined; }
        else props.duration = limit;
      } else if (typeof props.duration !== "number" && props.out === undefined) {
        props.duration = p.duration;
      }
      if (volume !== 1 && capabilitiesOf(p.kind).audio) props.volume = Number(rn.props.volume ?? 1) * volume;
      children.push({ ...spec, props: Object.fromEntries(Object.entries(props).filter(([, v]) => v !== undefined)) });
    }
    const trackProps: Record<string, Json> = { id: trackId, layout: "free" };
    for (const key of ["name", "role", "hidden", "muted", "solo"]) if (raw?.props[key] !== undefined) trackProps[key] = raw.props[key] as Json;
    tracks.push({ id: trackId, kind: "track", props: trackProps, children });
  }
  const layout = state.tracks.find((t) => t.id === node.parent)?.layout;
  const anchored = typeof node.props.anchor === "string";
  const gapId = layout === "sequence" && !anchored ? fresh(`${id}-gap`) : null;
  return { tracks, gap: gapId ? { id: gapId, kind: "gap", props: { id: gapId, duration: item.duration } } : null };
}
