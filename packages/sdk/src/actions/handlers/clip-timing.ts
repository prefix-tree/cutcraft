import { type CurveKey, capabilitiesOf, curveAt } from "@uberscene/kit/schema";

import { parseTimeRef } from "../../manifest/timeref";
import { lookupAsset } from "../../manifest/types";
import type { Json } from "../../patches/types";
import { isKeyList } from "../../resolve/expand";
import type { Placement as ResolvedPlacement, ResolvedState } from "../../resolve/resolve";
import { carry, carryRemoval, carrySplit, carryTrim } from "../carry";
import {
  define,
  insertNode,
  isError,
  onElement,
  placementOf,
  rawNode,
  rawProp,
  requireElement,
  requireUnlocked,
  setProps,
  validateTarget,
} from "../handler-kit";
import { type ActionError, type ActionInput, invalid, type KeyJson, type NodeSpec, nodeSpecOf, ok } from "../types";
import { canonicalKeys, readPath, writePath } from "./effect";

const TIMING_PROPS = ["in", "out", "duration", "start", "offset"] as const;

function timingOf(state: ResolvedState, id: string): Record<string, Json | undefined> {
  const out: Record<string, Json | undefined> = {};
  for (const p of TIMING_PROPS) out[p] = rawProp(state, id, p);
  return out;
}

function restoreTiming(before: ResolvedState, id: string): ActionInput {
  return { type: "source/setProps", params: { id, props: timingOf(before, id) } };
}

function layoutOf(state: ResolvedState, item: ResolvedPlacement): "sequence" | "free" | "anchored" {
  if (typeof rawProp(state, item.id, "anchor") === "string") return "anchored";
  return state.tracks.find((t) => t.id === item.track)?.layout ?? "sequence";
}

function sourceLimit(state: ResolvedState, item: ResolvedPlacement): number {
  const asset = item.source ? lookupAsset(state.manifest, item.source.asset) : null;
  return asset && asset.kind !== "image" ? asset.duration : Number.POSITIVE_INFINITY;
}

/**
 * Trim one edge. For elements with a source, `value` is the new source in/out
 * (seconds or a transcript/shot reference). For everything else `value` is the
 * new timeline time of that edge.
 */
define(carry(
  {
    type: "clip/trim",
    targets: onElement({ when: (item) => capabilitiesOf(item.kind).timed && item.kind !== "transition" }),
    validate: (a, state) => {
      const base = validateTarget(
        state,
        a.params.id,
        a.params.edge === "in" ? ["in", "start", "offset"] : ["out", "duration"],
      );
      if (!base.valid) return base;
      const item = state.items.get(a.params.id)!;
      const caps = capabilitiesOf(item.kind);
      const errors: ActionError[] = [];
      if (!caps.timed || item.kind === "transition")
        errors.push({ code: "INVALID_PARAMS", message: `<${item.kind}> cannot be trimmed` });
      const parsed = parseTimeRef(a.params.value);
      if (parsed.kind === "invalid") errors.push({ code: "INVALID_PARAMS", message: parsed.reason, path: "value" });
      if (!caps.trimSource && typeof a.params.value !== "number")
        errors.push({ code: "INVALID_PARAMS", message: "only source clips take references", path: "value" });
      if (caps.trimSource && item.source && typeof a.params.value === "number") {
        const v = a.params.value;
        if (a.params.edge === "out" && (v <= item.source.in || v > sourceLimit(state, item) + 0.05))
          errors.push({
            code: "OUT_OF_BOUNDS",
            message: `out must be within (${item.source.in}, ${sourceLimit(state, item)}]`,
          });
        if (a.params.edge === "in" && (v < 0 || v >= item.source.out))
          errors.push({ code: "OUT_OF_BOUNDS", message: `in must be within [0, ${item.source.out})` });
      }
      if (!caps.trimSource && typeof a.params.value === "number") {
        const v = a.params.value;
        if (a.params.edge === "out" && v <= item.start)
          errors.push({ code: "INVALID_TIME_RANGE", message: "the out edge must stay after the start" });
        if (a.params.edge === "in" && (v >= item.end || v < 0))
          errors.push({ code: "INVALID_TIME_RANGE", message: "the in edge must stay before the end" });
        if (a.params.edge === "in" && layoutOf(state, item) === "sequence")
          errors.push({
            code: "UNSUPPORTED_ON_LAYOUT",
            message: "an element without a source cannot move its start inside a sequence",
          });
      }
      return invalid(...errors);
    },
    apply: (a, log, ctx) => {
      const state = ctx.before;
      const item = state.items.get(a.params.id)!;
      const caps = capabilitiesOf(item.kind);
      const layout = layoutOf(state, item);
      if (caps.trimSource && item.source) {
        if (a.params.edge === "out") {
          setProps(log, item.id, { out: a.params.value as Json, duration: undefined });
        } else {
          const newIn = typeof a.params.value === "number" ? a.params.value : null;
          const delta = newIn === null ? 0 : (newIn - item.source.in) / item.source.speed;
          const props: Record<string, Json | undefined> = { in: a.params.value as Json };
          if (rawProp(state, item.id, "duration") !== undefined) props.out = item.source.out;
          if (rawProp(state, item.id, "duration") !== undefined) props.duration = undefined;
          if (layout === "free") props.start = item.start + delta;
          if (layout === "anchored") props.offset = Number(rawProp(state, item.id, "offset") ?? 0) + delta;
          setProps(log, item.id, props);
        }
        return;
      }
      const v = a.params.value as number;
      if (a.params.edge === "out") {
        setProps(log, item.id, { duration: v - item.start });
      } else {
        const delta = v - item.start;
        const props: Record<string, Json | undefined> = { duration: item.duration - delta };
        if (layout === "free") props.start = v;
        if (layout === "anchored") props.offset = Number(rawProp(state, item.id, "offset") ?? 0) + delta;
        setProps(log, item.id, props);
      }
    },
    invert: (a, before) => restoreTiming(before, a.params.id),
    fold: () => [],
  },
  (a, before) => carryTrim(a.params.id, before),
));

define({
  type: "clip/trimToPlayhead",
  targets: onElement(),
  validate: (a, state) => {
    const base = validateTarget(state, a.params.id, ["in", "out", "duration"]);
    if (!base.valid) return base;
    const item = state.items.get(a.params.id)!;
    if (a.params.at <= item.start || a.params.at >= item.end)
      return invalid({ code: "OUT_OF_BOUNDS", message: "playhead must be inside the element" });
    return ok;
  },
  apply: (a, log, ctx) => {
    const item = ctx.before.items.get(a.params.id)!;
    const state = ctx.before;
    const layout = layoutOf(state, item);
    if (item.source) {
      const sourceAt = item.source.in + (a.params.at - item.start) * item.source.speed;
      if (a.params.edge === "out") setProps(log, item.id, { out: sourceAt, duration: undefined });
      else {
        const props: Record<string, Json | undefined> = { in: sourceAt };
        if (rawProp(state, item.id, "duration") !== undefined) {
          props.out = item.source.out;
          props.duration = undefined;
        }
        if (layout === "free") props.start = a.params.at;
        if (layout === "anchored")
          props.offset = Number(rawProp(state, item.id, "offset") ?? 0) + (a.params.at - item.start);
        setProps(log, item.id, props);
      }
    } else if (a.params.edge === "out") {
      setProps(log, item.id, { duration: a.params.at - item.start });
    } else {
      const props: Record<string, Json | undefined> = { duration: item.end - a.params.at };
      if (layout === "free") props.start = a.params.at;
      if (layout === "anchored")
        props.offset = Number(rawProp(state, item.id, "offset") ?? 0) + (a.params.at - item.start);
      setProps(log, item.id, props);
    }
  },
  invert: (a, before) => restoreTiming(before, a.params.id),
  fold: () => [],
});

define({
  type: "clip/restoreTiming",
  validate: (a, state) =>
    validateTarget(
      state,
      a.params.id,
      TIMING_PROPS.filter((p) => p in a.params),
    ),
  apply: (a, log) => {
    const props: Record<string, Json | undefined> = {};
    for (const p of TIMING_PROPS) if (p in a.params) props[p] = (a.params as Record<string, Json | undefined>)[p];
    setProps(log, a.params.id, props);
  },
  invert: (a, before) => restoreTiming(before, a.params.id),
  fold: () => [],
});

/** Move the source window without moving the element. */
define({
  type: "clip/slip",
  targets: onElement({ when: (item) => item.source !== undefined }),
  validate: (a, state) => {
    const base = validateTarget(state, a.params.id, ["in", "out"]);
    if (!base.valid) return base;
    const item = state.items.get(a.params.id)!;
    if (!item.source) return invalid({ code: "INVALID_PARAMS", message: "only source clips slip" });
    const newIn = item.source.in + a.params.delta * item.source.speed;
    const newOut = item.source.out + a.params.delta * item.source.speed;
    if (newIn < 0 || newOut > sourceLimit(state, item) + 0.05)
      return invalid({ code: "OUT_OF_BOUNDS", message: "slip runs past the source" });
    return ok;
  },
  apply: (a, log, ctx) => {
    const item = ctx.before.items.get(a.params.id)!;
    const s = item.source!;
    setProps(log, item.id, {
      in: s.in + a.params.delta * s.speed,
      out: s.out + a.params.delta * s.speed,
      duration: undefined,
    });
  },
  invert: (a, before) => restoreTiming(before, a.params.id),
  fold: () => [],
});

function neighbours(
  state: ResolvedState,
  item: ResolvedPlacement,
): { prev: ResolvedPlacement | null; next: ResolvedPlacement | null } {
  const node = rawNode(state, item.id);
  const parent = node?.parent ? rawNode(state, node.parent) : undefined;
  if (!node || !parent) return { prev: null, next: null };
  const siblings = parent.children.filter((c) => c.kind !== "transition" && typeof c.props.anchor !== "string");
  const i = siblings.findIndex((c) => c.id === item.id);
  const prev = i > 0 ? (state.items.get((siblings[i - 1] as { id: string }).id) ?? null) : null;
  const next =
    i >= 0 && i < siblings.length - 1 ? (state.items.get((siblings[i + 1] as { id: string }).id) ?? null) : null;
  return { prev, next };
}

/** The clip keeps its content and moves by delta; the previous clip's tail and the next clip's head absorb it. */
define({
  type: "clip/slide",
  targets: onElement({
    when: (item, state) => {
      const { prev, next } = neighbours(state, item);
      return prev?.source !== undefined && next?.source !== undefined;
    },
  }),
  validate: (a, state) => {
    const base = validateTarget(state, a.params.id, []);
    if (!base.valid) return base;
    const item = state.items.get(a.params.id)!;
    const { prev, next } = neighbours(state, item);
    if (!prev?.source || !next?.source)
      return invalid({ code: "NOT_ADJACENT", message: "slide needs source clips on both sides" });
    const d = a.params.delta;
    if (prev.duration + d <= 0 || next.duration - d <= 0)
      return invalid({ code: "OUT_OF_BOUNDS", message: "slide would collapse a neighbour" });
    if (prev.source.out + d * prev.source.speed > sourceLimit(state, prev) + 0.05)
      return invalid({ code: "INSUFFICIENT_HANDLES", message: "previous clip has no handle" });
    if (next.source.in + d * next.source.speed < 0)
      return invalid({ code: "INSUFFICIENT_HANDLES", message: "next clip has no handle" });
    return ok;
  },
  apply: (a, log, ctx) => {
    const state = ctx.before;
    const item = state.items.get(a.params.id)!;
    const { prev, next } = neighbours(state, item);
    const d = a.params.delta;
    const ps = prev!.source!;
    const ns = next!.source!;
    setProps(log, prev!.id, { out: ps.out + d * ps.speed, duration: undefined });
    setProps(log, next!.id, {
      in: ns.in + d * ns.speed,
      duration: undefined,
      ...(layoutOf(state, next!) === "free" ? { start: next!.start + d } : {}),
    });
    if (layoutOf(state, item) === "free") setProps(log, item.id, { start: item.start + d });
  },
  invert: (a, before) => {
    const item = before.items.get(a.params.id)!;
    const { prev, next } = neighbours(before, item);
    return [restoreTiming(before, item.id), restoreTiming(before, prev!.id), restoreTiming(before, next!.id)];
  },
  fold: () => [],
});

/** Move the cut between two adjacent source clips; the sequence length does not change. */
define({
  type: "clip/roll",
  targets: onElement({
    param: "leftId",
    // A cut to roll: the clip after it, on a sequence, or one that starts where it ends, on a free track.
    when: (item, state) =>
      item.source !== undefined &&
      (layoutOf(state, item) === "sequence"
        ? neighbours(state, item).next?.source !== undefined
        : [...state.items.values()].some(
            (p) => p.track === item.track && p.source !== undefined && Math.abs(item.end - p.start) <= 0.001,
          )),
  }),
  validate: (a, state) => {
    const left = requireElement(state, a.params.leftId, "leftId");
    const right = requireElement(state, a.params.rightId, "rightId");
    if (isError(left)) return invalid(left);
    if (isError(right)) return invalid(right);
    const locked = requireUnlocked(state, left) ?? requireUnlocked(state, right);
    if (locked) return invalid(locked);
    if (!left.source || !right.source)
      return invalid({ code: "INVALID_PARAMS", message: "roll needs two source clips" });
    const adjacent =
      layoutOf(state, left) === "sequence"
        ? neighbours(state, left).next?.id === right.id
        : Math.abs(left.end - right.start) <= 0.001;
    if (!adjacent) return invalid({ code: "NOT_ADJACENT", message: "clips must meet at a cut" });
    const d = a.params.delta;
    if (left.duration + d <= 0 || right.duration - d <= 0)
      return invalid({ code: "OUT_OF_BOUNDS", message: "roll would collapse a clip" });
    if (
      left.source.out + d * left.source.speed > sourceLimit(state, left) + 0.05 ||
      right.source.in + d * right.source.speed < 0
    )
      return invalid({ code: "INSUFFICIENT_HANDLES", message: "not enough handle" });
    return ok;
  },
  apply: (a, log, ctx) => {
    const state = ctx.before;
    const left = state.items.get(a.params.leftId)!;
    const right = state.items.get(a.params.rightId)!;
    const d = a.params.delta;
    setProps(log, left.id, { out: left.source!.out + d * left.source!.speed, duration: undefined });
    setProps(log, right.id, {
      in: right.source!.in + d * right.source!.speed,
      duration: undefined,
      ...(layoutOf(state, right) === "free" ? { start: right.start + d } : {}),
    });
  },
  invert: (a, before) => [restoreTiming(before, a.params.leftId), restoreTiming(before, a.params.rightId)],
  fold: () => [],
});

function suffixId(id: string, suffix: string): string {
  return `${id}_${suffix}`;
}

interface SplitPlan {
  /** The children the second half starts with (masks), renamed. */
  readonly right: NodeSpec[];
  /** The first half's props that change: its key lists end at the cut, its holds after it go. */
  readonly leftProps: Record<string, Json | undefined>;
  /** The second half's key lists and holds, shifted to its own time. */
  readonly rightProps: Record<string, Json | undefined>;
}

/**
 * The value of a curve at `rel`, as the player draws it: the kit's `curveAt`, with numbers rounded to six places so a
 * key written at the cut reads back as written.
 */
function curveValue(keys: readonly CurveKey[], rel: number): unknown {
  const v = curveAt(keys, rel);
  if (typeof v === "number") return round(v);
  return Array.isArray(v) && v.every((x) => typeof x === "number") ? v.map(round) : v;
}

const round = (v: number): number => Math.round(v * 1e6) / 1e6;

/** The dotted paths of every key list in an element's props: inside `transform`, `box`, an effect, or at the top. */
function keyPathsOf(value: unknown, path = ""): string[] {
  if (isKeyList(value)) return [path];
  if (Array.isArray(value)) return value.flatMap((v, i) => keyPathsOf(v, path ? `${path}.${i}` : String(i)));
  if (value && typeof value === "object")
    return Object.entries(value).flatMap(([k, v]) => keyPathsOf(v, path ? `${path}.${k}` : k));
  return [];
}

/**
 * One curve cut at `atRel`: the first half keeps the keys before the cut and, when it lost some, ends on the value at
 * the cut; the second starts with the keys at or after it, shifted, and a key at 0 with the value there when the cut
 * fell mid-curve, easing on as the cut segment did.
 */
function splitKeys(keys: readonly KeyJson[], atRel: number): { left: KeyJson[]; right: KeyJson[] } {
  const sorted = [...keys].sort((a, b) => a.at - b.at);
  const curve: CurveKey[] = sorted.map((k) => ({ at: k.at, value: k.value, easing: k.easing as never }));
  const before = sorted.filter((k) => k.at < atRel);
  const after = sorted.filter((k) => k.at >= atRel);
  const value = curveValue(curve, atRel) as Json;
  const left = [...before];
  if (after.length > 0) left.push({ at: round(atRel), value });
  const right = after.map((k) => ({ ...k, at: round(k.at - atRel) }));
  if (before.length > 0 && !after.some((k) => k.at === atRel)) {
    const leaving = before[before.length - 1]?.easing;
    right.unshift({ at: 0, value, ...(after.length > 0 && leaving !== undefined ? { easing: leaving } : {}) });
  }
  return { left, right };
}

/**
 * Splits an element's keys, holds and children at `atRel` seconds into it. Each key list is cut as `splitKeys` says.
 * Holds starting at or after the cut move to the second half; masks are on both halves.
 */
function splitAt(node: NodeSpec, atRel: number, taken: Set<string>): SplitPlan {
  const unique = (id: string): string => {
    let candidate = id;
    for (let n = 2; taken.has(candidate); n++) candidate = `${id}${n}`;
    taken.add(candidate);
    return candidate;
  };
  const right = (node.children ?? []).map((child) => {
    const id = unique(suffixId(child.id, "b"));
    return { ...child, id, props: { ...child.props, id } };
  });
  const props = node.props as Record<string, unknown>;
  let leftAll: Record<string, unknown> = { ...props };
  let rightAll: Record<string, unknown> = { ...props };
  const touched = new Set<string>();
  for (const path of keyPathsOf(props)) {
    const { left, right: r } = splitKeys(readPath(props, path) as unknown as KeyJson[], atRel);
    const l = writePath(leftAll, path, canonicalKeys(left));
    leftAll = { ...leftAll, [l.prop]: l.value };
    const w = writePath(rightAll, path, canonicalKeys(r));
    rightAll = { ...rightAll, [w.prop]: w.value };
    touched.add(l.prop);
  }
  if (Array.isArray(props.freezes)) {
    const holds = props.freezes as { at: number; duration: number; source: number }[];
    const stay = holds.filter((h) => h.at < atRel);
    const moved = holds.filter((h) => h.at >= atRel).map((h) => ({ ...h, at: round(h.at - atRel) }));
    leftAll.freezes = stay.length > 0 ? stay : undefined;
    rightAll.freezes = moved.length > 0 ? moved : undefined;
    touched.add("freezes");
  }
  const pick = (all: Record<string, unknown>) =>
    Object.fromEntries([...touched].map((k) => [k, all[k] as Json | undefined]));
  return { right, leftProps: pick(leftAll), rightProps: pick(rightAll) };
}

/** Replace one element by two at a timeline time strictly inside it. */
define(carry(
  {
    type: "clip/split",
    targets: onElement({
      when: (item) => capabilitiesOf(item.kind).timed && item.kind !== "transition" && item.kind !== "gap",
    }),
    validate: (a, state) => {
      const base = validateTarget(state, a.params.id, ["in", "out", "duration"]);
      if (!base.valid) return base;
      const item = state.items.get(a.params.id)!;
      if (state.tree.byId.has(a.params.newId))
        return invalid({ code: "DUPLICATE_ID", message: `"${a.params.newId}" exists` });
      if (!capabilitiesOf(item.kind).timed || item.kind === "transition" || item.kind === "gap")
        return invalid({ code: "INVALID_PARAMS", message: `<${item.kind}> cannot be split` });
      if (a.params.at <= item.start + 1e-6 || a.params.at >= item.end - 1e-6)
        return invalid({ code: "OUT_OF_BOUNDS", message: "split must fall strictly inside the element" });
      return ok;
    },
    apply: (a, log, ctx) => {
      const state = ctx.before;
      const item = state.items.get(a.params.id)!;
      const node = rawNode(state, item.id)!;
      const spec = nodeSpecOf(node);
      const atRel = a.params.at - item.start;
      const layout = layoutOf(state, item);
      const taken = new Set<string>([...state.tree.byId.keys(), a.params.newId]);
      const split = splitAt(spec, atRel, taken);
      const right = split.right;
      const rightProps: Record<string, Json | undefined> = { ...spec.props, ...split.rightProps, id: a.params.newId };
      const leftProps: Record<string, Json | undefined> = { ...split.leftProps };
      if (item.source) {
        const boundary = item.source.in + atRel * item.source.speed;
        leftProps.out = boundary;
        leftProps.duration = undefined;
        rightProps.in = boundary;
        rightProps.out = item.source.out;
        delete rightProps.duration;
      } else {
        leftProps.duration = atRel;
        rightProps.duration = item.duration - atRel;
      }
      if (layout === "free") rightProps.start = a.params.at;
      if (layout === "anchored") rightProps.offset = Number(rawProp(state, item.id, "offset") ?? 0) + atRel;
      setProps(log, item.id, leftProps);
      const cleaned = Object.fromEntries(Object.entries(rightProps).filter(([, v]) => v !== undefined));
      insertNode(log, node.parent as string, item.id, { ...spec, id: a.params.newId, props: cleaned, children: right });
    },
    invert: (a, before) => ({
      type: "clip/merge",
      params: { id: a.params.id, rightId: a.params.newId, original: nodeSpecOf(rawNode(before, a.params.id)!) },
    }),
    fold: () => [],
  },
  (a, before) => carrySplit(a.params.id, a.params.newId, before),
));

define({
  type: "clip/merge",
  validate: (a, state) => {
    const base = validateTarget(state, a.params.id, []);
    if (!base.valid) return base;
    return state.items.has(a.params.rightId)
      ? ok
      : invalid({ code: "ELEMENT_NOT_FOUND", message: `"${a.params.rightId}" does not exist` });
  },
  apply: (a, log, ctx) => {
    const node = rawNode(ctx.before, a.params.id)!;
    log.append({ op: "remove", id: a.params.rightId });
    log.append({ op: "remove", id: a.params.id });
    insertNode(
      log,
      node.parent as string,
      placementOf(ctx.before, a.params.id) && siblingBefore(ctx.before, a.params.id),
      a.params.original,
    );
  },
  invert: (a, before) => {
    const left = before.items.get(a.params.id)!;
    const right = before.items.get(a.params.rightId)!;
    return {
      type: "clip/split",
      params: { id: a.params.id, at: left.end === right.start ? left.end : left.end, newId: a.params.rightId },
    };
  },
  fold: () => [],
});

function siblingBefore(state: ResolvedState, id: string): string | null {
  const node = rawNode(state, id);
  const parent = node?.parent ? rawNode(state, node.parent) : undefined;
  if (!node || !parent) return null;
  const i = parent.children.findIndex((c) => c.id === id);
  return i > 0 ? (parent.children[i - 1] as { id: string }).id : null;
}

/** Free layout: delete and pull later items on the track left by the deleted length. Sequence: plain remove. */
define(carry(
  {
    type: "clip/rippleDelete",
    targets: onElement(),
    validate: (a, state) => validateTarget(state, a.params.id, []),
    apply: (a, log, ctx) => {
      const state = ctx.before;
      const item = state.items.get(a.params.id)!;
      log.append({ op: "remove", id: item.id });
      if (layoutOf(state, item) !== "free") return;
      for (const later of laterOnTrack(state, item)) setProps(log, later.id, { start: later.start - item.duration });
    },
    invert: (a, before) => {
      const item = before.items.get(a.params.id)!;
      const node = rawNode(before, item.id)!;
      const affected =
        layoutOf(before, item) === "free" ? laterOnTrack(before, item).map((l) => ({ id: l.id, start: l.start })) : [];
      return {
        type: "clip/rippleRestore",
        params: {
          id: item.id,
          node: nodeSpecOf(node),
          trackId: node.parent as string,
          place: placementOf(before, item.id),
          affected,
        },
      };
    },
    fold: () => [],
  },
  (a, before) => carryRemoval(a.params.id, before),
));

define({
  type: "clip/rippleRestore",
  validate: (a, state) =>
    state.tree.byId.has(a.params.id) ? invalid({ code: "DUPLICATE_ID", message: `"${a.params.id}" exists` }) : ok,
  apply: (a, log) => {
    const after = "after" in a.params.place ? a.params.place.after : null;
    insertNode(log, a.params.trackId, after, a.params.node);
    for (const p of a.params.affected) setProps(log, p.id, { start: p.start });
  },
  invert: (a) => ({ type: "clip/rippleDelete", params: { id: a.params.id } }),
  fold: () => [],
});

function laterOnTrack(state: ResolvedState, item: ResolvedPlacement): ResolvedPlacement[] {
  const track = state.tracks.find((t) => t.id === item.track);
  if (!track) return [];
  return track.items
    .map((id) => state.items.get(id))
    .filter(
      (i): i is ResolvedPlacement =>
        Boolean(i) &&
        i!.id !== item.id &&
        i!.start >= item.end - 1e-6 &&
        typeof rawProp(state, i!.id, "start") === "number",
    );
}

/** Free layout: shift this element and every later one left until it meets the previous element. Sequence: remove the Gap before it. */
define({
  type: "clip/closeGapBefore",
  targets: onElement({
    when: (item, state) => {
      const layout = layoutOf(state, item);
      if (layout === "anchored") return false;
      if (layout !== "sequence") return true;
      const before = siblingBefore(state, item.id);
      return before !== null && rawNode(state, before)?.kind === "gap";
    },
  }),
  validate: (a, state) => {
    const base = validateTarget(state, a.params.id, []);
    if (!base.valid) return base;
    const item = state.items.get(a.params.id)!;
    const layout = layoutOf(state, item);
    if (layout === "anchored")
      return invalid({ code: "UNSUPPORTED_ON_LAYOUT", message: "anchored elements have no gap" });
    if (layout === "sequence") {
      const before = siblingBefore(state, item.id);
      return before && rawNode(state, before)?.kind === "gap"
        ? ok
        : invalid({ code: "INVALID_PARAMS", message: "no gap before this element" });
    }
    return ok;
  },
  apply: (a, log, ctx) => {
    const state = ctx.before;
    const item = state.items.get(a.params.id)!;
    if (layoutOf(state, item) === "sequence") {
      log.append({ op: "remove", id: siblingBefore(state, item.id) as string });
      return;
    }
    const track = state.tracks.find((t) => t.id === item.track)!;
    const prevEnd = Math.max(
      0,
      ...track.items
        .map((id) => state.items.get(id))
        .filter((i) => i && i.id !== item.id && i.end <= item.start + 1e-6 && i.kind !== "transition")
        .map((i) => i!.end),
    );
    const shift = item.start - prevEnd;
    if (shift <= 0) return;
    setProps(log, item.id, { start: prevEnd });
    for (const later of laterOnTrack(state, item)) setProps(log, later.id, { start: later.start - shift });
  },
  invert: (a, before) => {
    const item = before.items.get(a.params.id)!;
    if (layoutOf(before, item) === "sequence") {
      const gapId = siblingBefore(before, item.id) as string;
      const gap = rawNode(before, gapId)!;
      return {
        type: "element/restore",
        params: {
          id: gapId,
          node: nodeSpecOf(gap),
          trackId: gap.parent as string,
          place: { after: siblingBefore(before, gapId) },
        },
      };
    }
    const positions = [item, ...laterOnTrack(before, item)].map((i) => ({ id: i.id, start: i.start }));
    return { type: "track/restorePositions", params: { trackId: item.track as string, positions } };
  },
  fold: () => [],
});

export { restoreTiming };
