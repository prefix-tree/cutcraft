// Effects and keys are props of the element they belong to: `effects={[…]}`, and a list of keys in place of a value.
// Every action here writes that prop on the element, so its undo is the prop as it was (`source/setProps`), and the
// fold rewrites one prop.

import { effectParamProblem, shaderFor, VIDEO_EFFECT_TYPES } from "@uberscene/kit/schema";

import type { Json } from "../../patches/types";
import { isKeyList } from "../../resolve/expand";
import type { ResolvedState } from "../../resolve/resolve";
import { define, makePropHandler, onElement, rawNode, rawProp } from "../handler-kit";
import { invalid, type KeyJson, ok, type ValidationResult } from "../types";

/** The paths a key list may sit at, besides an effect's params (`effects.<n>.<param>`). */
const KEY_PATHS: ReadonlySet<string> = new Set([
  "transform.scale",
  "transform.scale.x",
  "transform.scale.y",
  "transform.rotation",
  "transform.opacity",
  "transform.anchor.x",
  "transform.anchor.y",
  "transform.borderRadius",
  "transform.crop.x",
  "transform.crop.y",
  "transform.crop.width",
  "transform.crop.height",
  "box.x",
  "box.y",
  "volume",
  "pan",
  "speed",
]);

const EFFECT_PARAM = /^effects\.(\d+)\.([A-Za-z_]\w*)$/;

/** Why `path` cannot hold keys on element `id`, or null. */
function pathProblem(state: ResolvedState, id: string, path: string): string | null {
  const fx = EFFECT_PARAM.exec(path);
  if (fx) {
    const effects = effectsOf(state, id);
    return Number(fx[1]) < effects.length ? null : `element "${id}" has no effect ${fx[1]}`;
  }
  return KEY_PATHS.has(path)
    ? null
    : `"${path}" cannot hold keys; use one of ${[...KEY_PATHS].join(", ")}, or effects.<n>.<param>`;
}

/** The value at a dotted path inside an element's raw props; a number segment indexes a list. */
export function readPath(props: Readonly<Record<string, unknown>> | undefined, path: string): unknown {
  let at: unknown = props;
  for (const seg of path.split(".")) {
    if (at === null || typeof at !== "object") return undefined;
    // One list for both axes (`scale: [...]`) is each axis's list.
    if (isKeyList(at) && (seg === "x" || seg === "y")) continue;
    at = Array.isArray(at) ? at[Number(seg)] : (at as Record<string, unknown>)[seg];
  }
  return at;
}

/**
 * The element's top-level prop with `value` written at `path` inside it: objects and lists along the way are copied,
 * an `undefined` value removes the field, and an object left empty is removed. A number `scale` that gains keys on one
 * axis becomes `{ x, y }`.
 */
export function writePath(
  props: Readonly<Record<string, unknown>> | undefined,
  path: string,
  value: unknown,
): { readonly prop: string; readonly value: Json | undefined } {
  const [top, ...rest] = path.split(".") as [string, ...string[]];
  const put = (container: unknown, segs: readonly string[]): unknown => {
    if (segs.length === 0) return value;
    const [seg, ...more] = segs as [string, ...string[]];
    // A number or one list for both axes, written on one axis: both axes, the other keeping what it had.
    if ((typeof container === "number" || isKeyList(container)) && (seg === "x" || seg === "y")) {
      const base: Record<string, unknown> = { x: container, y: container };
      base[seg] = put(container, more);
      return base;
    }
    if (Array.isArray(container)) {
      const copy = [...container];
      copy[Number(seg)] = put(copy[Number(seg)], more);
      return copy;
    }
    const base: Record<string, unknown> =
      container && typeof container === "object" ? { ...(container as Record<string, unknown>) } : {};
    const next = put(base[seg], more);
    if (next === undefined) delete base[seg];
    else base[seg] = next;
    return Object.keys(base).length === 0 ? undefined : base;
  };
  return { prop: top, value: put(props?.[top], rest) as Json | undefined };
}

/** The keys at `path`: the list written there, or none when it holds a constant or nothing. */
function keysAt(state: ResolvedState, id: string, path: string): KeyJson[] {
  const v = readPath(rawNode(state, id)?.props, path);
  return isKeyList(v) ? (v as unknown as KeyJson[]).map((k) => ({ ...k })) : [];
}

/** Keys as a file writes them: sorted by time; none is nothing. A single key stays a key, so it keeps its time. */
export function canonicalKeys(keys: readonly KeyJson[]): Json | undefined {
  const sorted = [...keys].sort((a, b) => a.at - b.at);
  if (sorted.length === 0) return undefined;
  return sorted.map((k) => ({ at: k.at, value: k.value, ...(k.easing !== undefined ? { easing: k.easing } : {}) }));
}

function writeKeys(state: ResolvedState, id: string, path: string, keys: readonly KeyJson[]) {
  const { prop, value } = writePath(rawNode(state, id)?.props, path, canonicalKeys(keys));
  return { [prop]: value };
}

/** The element's effects as written, each a `{ type, ...params }` object. */
function effectsOf(state: ResolvedState, id: string): Record<string, Json>[] {
  const v = rawProp(state, id, "effects");
  return Array.isArray(v) ? (v as Record<string, Json>[]).map((e) => ({ ...e })) : [];
}

const keyTargets = onElement({ when: (item) => item.duration > 0 });

function insideElement(state: ResolvedState, id: string, at: number): ValidationResult {
  const item = state.items.get(id);
  return item && at >= 0 && at <= item.duration + 1e-6
    ? ok
    : invalid({ code: "OUT_OF_BOUNDS", message: "a key's time must be inside the element", path: "at" });
}

function checkPath(state: ResolvedState, id: string, path: string): ValidationResult {
  const problem = pathProblem(state, id, path);
  return problem ? invalid({ code: "INVALID_PARAMS", message: problem, path: "path" }) : ok;
}

/** A value an effect's param takes, when `path` is one. */
function checkValue(state: ResolvedState, id: string, path: string, value: Json | undefined): ValidationResult {
  const fx = EFFECT_PARAM.exec(path);
  if (!fx || value === undefined) return ok;
  const effect = effectsOf(state, id)[Number(fx[1])];
  const problem = effectParamProblem(effect?.type, state.shaders, fx[2] as string, value);
  return problem ? invalid({ code: "INVALID_PARAMS", message: problem.message, path: "value" }) : ok;
}

const all = (...results: ValidationResult[]): ValidationResult => results.find((r) => !r.valid) ?? ok;

// ── keys ────────────────────────────────────────────────────────────────────

define(makePropHandler({
  type: "key/add",
  targets: keyTargets,
  write: (p, state) => {
    // A constant there becomes the first key, at 0, so the value before the new key is what it was.
    const written = readPath(rawNode(state, p.id)?.props, p.path);
    const before: KeyJson[] =
      written !== undefined && !isKeyList(written) && p.at > 0 ? [{ at: 0, value: written as Json }] : [];
    const keys = [...before, ...keysAt(state, p.id, p.path)].filter((k) => Math.abs(k.at - p.at) > 1e-9);
    return writeKeys(state, p.id, p.path, [
      ...keys,
      { at: p.at, value: p.value, ...(p.easing !== undefined ? { easing: p.easing } : {}) },
    ]);
  },
  validate: (a, state) =>
    all(
      checkPath(state, a.params.id, a.params.path),
      insideElement(state, a.params.id, a.params.at),
      checkValue(state, a.params.id, a.params.path, a.params.value),
    ),
}));

/** The key of `path` at `at`, or an error naming the times there are. */
function requireKey(state: ResolvedState, id: string, path: string, at: number): ValidationResult {
  const keys = keysAt(state, id, path);
  return keys.some((k) => Math.abs(k.at - at) <= 1e-9)
    ? ok
    : invalid({
        code: "ELEMENT_NOT_FOUND",
        message: `"${id}" has no key at ${at} s on ${path}${keys.length ? ` (keys at ${keys.map((k) => k.at).join(", ")})` : ""}`,
        path: "at",
      });
}

define(makePropHandler({
  type: "key/update",
  targets: onElement({ when: (item, state) => hasKeys(state, item.id) }),
  write: (p, state) =>
    writeKeys(
      state,
      p.id,
      p.path,
      keysAt(state, p.id, p.path).map((k) =>
        Math.abs(k.at - p.at) <= 1e-9
          ? {
              ...k,
              ...("value" in p ? { value: p.value as Json } : {}),
              ...(p.easing !== undefined ? { easing: p.easing } : {}),
            }
          : k,
      ),
    ),
  validate: (a, state) =>
    all(
      requireKey(state, a.params.id, a.params.path, a.params.at),
      checkValue(state, a.params.id, a.params.path, a.params.value),
    ),
}));

define(makePropHandler({
  type: "key/move",
  targets: onElement({ onLocked: true, onOpaque: true, when: (item, state) => hasKeys(state, item.id) }),
  write: (p, state) =>
    writeKeys(
      state,
      p.id,
      p.path,
      keysAt(state, p.id, p.path)
        .filter((k) => Math.abs(k.at - p.to) > 1e-9 || Math.abs(k.at - p.at) <= 1e-9)
        .map((k) => (Math.abs(k.at - p.at) <= 1e-9 ? { ...k, at: p.to } : k)),
    ),
  validate: (a, state) =>
    all(requireKey(state, a.params.id, a.params.path, a.params.at), insideElement(state, a.params.id, a.params.to)),
}));

define(makePropHandler({
  type: "key/remove",
  targets: onElement({ when: (item, state) => hasKeys(state, item.id) }),
  write: (p, state) =>
    writeKeys(
      state,
      p.id,
      p.path,
      keysAt(state, p.id, p.path).filter((k) => Math.abs(k.at - p.at) > 1e-9),
    ),
  validate: (a, state) => requireKey(state, a.params.id, a.params.path, a.params.at),
}));

define(makePropHandler({
  type: "key/setAll",
  targets: keyTargets,
  write: (p, state) => writeKeys(state, p.id, p.path, p.keys),
  validate: (a, state) =>
    all(
      checkPath(state, a.params.id, a.params.path),
      ...a.params.keys.map((k) => insideElement(state, a.params.id, k.at)),
      ...a.params.keys.map((k) => checkValue(state, a.params.id, a.params.path, k.value)),
    ),
}));

/** Whether the element has any key: an item the resolver made from a key list. */
function hasKeys(state: ResolvedState, id: string): boolean {
  for (const item of state.items.values()) if (item.kind === "keyframe" && item.id.startsWith(`${id}.`)) return true;
  return false;
}

// ── effects ─────────────────────────────────────────────────────────────────

const hasEffects = (state: ResolvedState, id: string): boolean => effectsOf(state, id).length > 0;

function requireIndex(state: ResolvedState, id: string, index: number): ValidationResult {
  const n = effectsOf(state, id).length;
  return Number.isInteger(index) && index >= 0 && index < n
    ? ok
    : invalid({
        code: "ELEMENT_NOT_FOUND",
        message: `"${id}" has ${n} effect${n === 1 ? "" : "s"}; no index ${index}`,
        path: "index",
      });
}

define(makePropHandler({
  type: "effect/add",
  targets: onElement(),
  write: (p, state) => {
    const effects = effectsOf(state, p.id);
    effects.splice(Math.min(p.index ?? effects.length, effects.length), 0, { ...p.effect });
    return { effects };
  },
  validate: (a, state) => {
    const type = a.params.effect?.type;
    return typeof type === "string" &&
      ((VIDEO_EFFECT_TYPES as readonly string[]).includes(type) || shaderFor(state.shaders, "effect", type))
      ? ok
      : invalid({ code: "INVALID_PARAMS", message: `unknown effect type "${String(type)}"`, path: "effect.type" });
  },
}));

define(makePropHandler({
  type: "effect/remove",
  targets: onElement({ when: (item, state) => hasEffects(state, item.id) }),
  write: (p, state) => {
    const effects = effectsOf(state, p.id);
    effects.splice(p.index, 1);
    return { effects: effects.length > 0 ? effects : undefined };
  },
  validate: (a, state) => requireIndex(state, a.params.id, a.params.index),
}));

define(makePropHandler({
  type: "effect/update",
  targets: onElement({ when: (item, state) => hasEffects(state, item.id) }),
  write: (p, state) => {
    const effects = effectsOf(state, p.id);
    const merged: Record<string, Json> = { ...effects[p.index] };
    for (const [k, v] of Object.entries(p.params)) {
      if (v === null) delete merged[k];
      else merged[k] = v;
    }
    effects[p.index] = merged;
    return { effects };
  },
  validate: (a, state) =>
    all(
      requireIndex(state, a.params.id, a.params.index),
      ...Object.entries(a.params.params).map(([k, v]) =>
        v === null || isKeyList(v) ? ok : checkValue(state, a.params.id, `effects.${a.params.index}.${k}`, v),
      ),
    ),
}));

define(makePropHandler({
  type: "effect/toggle",
  targets: onElement({ when: (item, state) => hasEffects(state, item.id) }),
  write: (p, state) => {
    const effects = effectsOf(state, p.id);
    const { enabled: _, ...rest } = effects[p.index] ?? {};
    effects[p.index] = p.enabled ? rest : { ...rest, enabled: false };
    return { effects };
  },
  validate: (a, state) => requireIndex(state, a.params.id, a.params.index),
}));

define(makePropHandler({
  type: "effect/setOrder",
  targets: onElement({ when: (item, state) => effectsOf(state, item.id).length > 1 }),
  write: (p, state) => {
    const effects = effectsOf(state, p.id);
    return { effects: p.order.map((i) => effects[i] as Record<string, Json>) };
  },
  validate: (a, state) => {
    const n = effectsOf(state, a.params.id).length;
    const sorted = [...a.params.order].sort((x, y) => x - y);
    return sorted.length === n && sorted.every((v, i) => v === i)
      ? ok
      : invalid({
          code: "INVALID_PARAMS",
          message: `order must name each of the ${n} effects once, by index`,
          path: "order",
        });
  },
}));

define(makePropHandler({
  type: "effect/setStack",
  targets: onElement(),
  write: (p) => ({ effects: p.effects.length > 0 ? p.effects.map((e) => ({ ...e })) : undefined }),
}));

// ── holds ───────────────────────────────────────────────────────────────────

define(makePropHandler({
  type: "freeze/setAll",
  kinds: ["clip", "audio"],
  write: (p) => ({
    freezes:
      p.freezes.length > 0 ? p.freezes.map((f) => ({ at: f.at, duration: f.duration, source: f.source })) : undefined,
  }),
  validate: (a) =>
    a.params.freezes.every((f) => f.at >= 0 && f.duration > 0 && f.source >= 0)
      ? ok
      : invalid({ code: "INVALID_PARAMS", message: "a hold has at ≥ 0, duration > 0 and source ≥ 0", path: "freezes" }),
}));
