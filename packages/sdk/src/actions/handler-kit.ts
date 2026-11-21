import { asJson } from "../patches/log";
import type { Json, PatchLog } from "../patches/types";
import type { Placement as ResolvedPlacement, ResolvedState } from "../resolve/resolve";
import { type CollectedNode, INTERIOR_PREFIX } from "../resolve/tree";
import { type ActionHandler, type ElementTarget, registerHandler } from "./registry";
import {
  type Action,
  type ActionError,
  type ActionType,
  invalid,
  type NodeSpec,
  nodeOfSpec,
  ok,
  type PlacementSpec,
  type ValidationResult,
} from "./types";

// ── validators ──────────────────────────────────────────────────────────────

export function requireElement(state: ResolvedState, id: unknown, path = "id"): ActionError | ResolvedPlacement {
  if (typeof id !== "string") return { code: "INVALID_PARAMS", message: `${path} must be a string`, path };
  const item = state.items.get(id);
  return item ?? { code: "ELEMENT_NOT_FOUND", message: `element "${id}" does not exist`, path };
}

export function requireUnlocked(state: ResolvedState, item: ResolvedPlacement): ActionError | null {
  const track = item.track ? state.tracks.find((t) => t.id === item.track) : undefined;
  if (track?.locked) return { code: "TRACK_LOCKED", message: `track "${track.id}" is locked` };
  return null;
}

export function requireNotOpaque(item: ResolvedPlacement): ActionError | null {
  return item.editable === "opaque" ? { code: "OPAQUE_TARGET", message: `"${item.id}" is model-only code` } : null;
}

/**
 * A prop, or a key of one (`style.font`), the action writes is not an expression. A prop is locked whole, or, a `style`
 * object, key by key: writing `style.size` is refused only when `style` or `style.size` is locked.
 */
function requireLiteralProp(item: ResolvedPlacement, prop: string): ActionError | null {
  const top = prop.split(".")[0] as string;
  const locked = item.lockedProps.includes(prop) ? prop : item.lockedProps.includes(top) ? top : null;
  return locked !== null
    ? { code: "LOCKED_PROP", message: `"${item.id}.${locked}" is an expression; bake it first`, path: locked }
    : null;
}

/**
 * The paths a write of `props` changes, for `validateTarget`: each prop, and for a `style` object whose keys lock one
 * by one, each key whose value differs from `before`'s.
 */
export function writtenPaths(
  item: ResolvedPlacement,
  props: Readonly<Record<string, unknown>>,
  before: (prop: string) => unknown,
): string[] {
  const out: string[] = [];
  for (const [prop, value] of Object.entries(props)) {
    const keyed = item.lockedProps.some((p) => p.startsWith(`${prop}.`));
    if (!keyed) {
      out.push(prop);
      continue;
    }
    const prior = before(prop);
    const was = isPlain(prior) ? prior : {};
    const now = isPlain(value) ? value : {};
    if (!isPlain(value)) out.push(prop);
    for (const key of new Set([...Object.keys(was), ...Object.keys(now)]))
      if (JSON.stringify(was[key]) !== JSON.stringify(now[key])) out.push(`${prop}.${key}`);
  }
  return out;
}

function isPlain(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function requireLayout(
  state: ResolvedState,
  item: ResolvedPlacement,
  layout: "sequence" | "free",
): ActionError | null {
  const track = state.tracks.find((t) => t.id === item.track);
  if (!track || track.layout !== layout) return { code: "UNSUPPORTED_ON_LAYOUT", message: `needs a ${layout} track` };
  return null;
}

export function isError(value: ActionError | ResolvedPlacement): value is ActionError {
  return "code" in value && "message" in value && !("kind" in value);
}

/** Standard checks for a prop write on an element. */
export function validateTarget(state: ResolvedState, id: unknown, props: readonly string[] = []): ValidationResult {
  const item = requireElement(state, id);
  if (isError(item)) return invalid(item);
  const errors: ActionError[] = [];
  const locked = requireUnlocked(state, item);
  if (locked) errors.push(locked);
  const opaque = requireNotOpaque(item);
  if (opaque) errors.push(opaque);
  for (const p of props) {
    const e = requireLiteralProp(item, p);
    if (e) errors.push(e);
  }
  return invalid(...errors);
}

/** The element-level checks an action makes, for its `targets` face. Each default matches `validateTarget`. */
export interface TargetSpec {
  /** The param that names the element. Default `id`. */
  readonly param?: string;
  /** The kinds it applies to; any when left out. */
  readonly kinds?: readonly string[];
  /** It does not check the track's lock. */
  readonly onLocked?: boolean;
  /** It does not refuse model-only code. */
  readonly onOpaque?: boolean;
  /** It refuses generated elements (bake first). */
  readonly literalOnly?: boolean;
  /** Any further check on the element alone. */
  readonly when?: (item: ResolvedPlacement, state: ResolvedState) => boolean;
}

export function onElement(spec: TargetSpec = {}): ElementTarget {
  return {
    param: spec.param ?? "id",
    accepts: (item, state) =>
      (spec.onLocked === true || requireUnlocked(state, item) === null) &&
      (spec.onOpaque === true || requireNotOpaque(item) === null) &&
      (spec.literalOnly !== true || item.editable !== "generated") &&
      (spec.kinds === undefined || spec.kinds.includes(item.kind)) &&
      (spec.when?.(item, state) ?? true),
  };
}

// ── raw access ──────────────────────────────────────────────────────────────

export function rawNode(state: ResolvedState, id: string): CollectedNode | undefined {
  return state.tree.byId.get(id);
}

export function rawProp(state: ResolvedState, id: string, prop: string): Json | undefined {
  const node = rawNode(state, id);
  if (prop.startsWith(INTERIOR_PREFIX)) return asJson(node?.interior?.props[prop.slice(INTERIOR_PREFIX.length)]);
  return asJson(node?.props[prop]);
}

export function siblingAfter(state: ResolvedState, id: string): string | null {
  const node = rawNode(state, id);
  const parent = node?.parent ? rawNode(state, node.parent) : undefined;
  if (!node || !parent) return null;
  const index = parent.children.findIndex((c) => c.id === id);
  return index > 0 ? (parent.children[index - 1] as CollectedNode).id : null;
}

export function placementProps(place: PlacementSpec): Record<string, Json | undefined> {
  // `at` only means something beside its anchor, so a placement without one drops it.
  if ("start" in place) return { start: place.start, anchor: undefined, offset: undefined, at: undefined };
  if ("anchor" in place) return { anchor: place.anchor, offset: place.offset, start: undefined };
  return { start: undefined, anchor: undefined, offset: undefined, at: undefined };
}

export function placementOf(state: ResolvedState, id: string): PlacementSpec {
  const node = rawNode(state, id);
  if (!node) return { after: null };
  if (typeof node.props.anchor === "string") {
    return typeof node.props.offset === "number"
      ? { anchor: node.props.anchor, offset: node.props.offset }
      : { anchor: node.props.anchor };
  }
  if (typeof node.props.start === "number") return { start: node.props.start };
  return { after: siblingAfter(state, id) };
}

/** `base`, or `base-2`, `base-3`, … until it names nothing in the tree, the resolved items or `taken`. */
export function uniqueId(state: ResolvedState, base: string, taken: ReadonlySet<string> = new Set()): string {
  let id = base;
  for (let n = 2; state.tree.byId.has(id) || state.items.has(id) || taken.has(id); n++) id = `${base}-${n}`;
  return id;
}

export function setProps(log: PatchLog, id: string, props: Readonly<Record<string, Json | undefined>>): void {
  for (const [prop, value] of Object.entries(props)) log.append({ op: "set", id, prop, value });
}

export function insertNode(log: PatchLog, parent: string, after: string | null, spec: NodeSpec): void {
  log.append({ op: "insert", id: spec.id, parent, after, node: nodeOfSpec(spec, parent) });
}

export function placeNode(
  log: PatchLog,
  state: ResolvedState,
  parent: string,
  place: PlacementSpec,
  spec: NodeSpec,
  afterOverride?: string | null,
): void {
  const after =
    afterOverride !== undefined ? afterOverride : "after" in place ? place.after : lastChildId(state, parent);
  const props = { ...spec.props, ...placementProps(place) };
  const cleaned = Object.fromEntries(Object.entries(props).filter(([, v]) => v !== undefined));
  insertNode(log, parent, after, { ...spec, props: cleaned });
}

export function lastChildId(state: ResolvedState, parent: string): string | null {
  const node = rawNode(state, parent);
  const last = node?.children[node.children.length - 1];
  return last ? last.id : null;
}

// ── factories ───────────────────────────────────────────────────────────────

type Params<T extends ActionType> = Action<T>["params"];

export interface PropHandlerSpec<T extends ActionType> {
  readonly type: T;
  /** Which props the action writes, from its params. */
  readonly write: (params: Params<T>, state: ResolvedState) => Readonly<Record<string, Json | undefined>>;
  /** Which param carries the target id. */
  readonly target?: (params: Params<T>) => string;
  readonly validate?: (action: Action<T>, state: ResolvedState) => ValidationResult;
  readonly kinds?: readonly string[];
  /**
   * The element it is about, for `affordances()`. Left out, an action that targets `id` gets one from `kinds`; one with
   * its own `target` gets none unless it names the param here.
   */
  readonly targets?: TargetSpec;
}

/** An action that sets literal props on one element; the inverse sets the prior values. */
export function makePropHandler<T extends ActionType>(spec: PropHandlerSpec<T>): ActionHandler<T> {
  const target = spec.target ?? ((params: Params<T>) => (params as { id: string }).id);
  const targets =
    spec.targets !== undefined || spec.target === undefined
      ? onElement({ ...(spec.kinds ? { kinds: spec.kinds } : {}), ...spec.targets })
      : undefined;
  const handler: ActionHandler<T> = {
    type: spec.type,
    ...(targets ? { targets } : {}),
    validate(action, state) {
      const id = target(action.params);
      const written = spec.write(action.params, state);
      const item = state.items.get(id);
      const props = item ? writtenPaths(item, written, (prop) => rawProp(state, id, prop)) : Object.keys(written);
      const base = validateTarget(state, id, props);
      if (!base.valid) return base;
      if (spec.kinds && item && !spec.kinds.includes(item.kind)) {
        return invalid({ code: "INVALID_PARAMS", message: `${spec.type} does not apply to <${item.kind}>` });
      }
      return spec.validate ? spec.validate(action, state) : ok;
    },
    apply(action, log, ctx) {
      setProps(log, target(action.params), spec.write(action.params, ctx.before));
    },
    invert(action, before) {
      const id = target(action.params);
      const prior: Record<string, Json | undefined> = {};
      for (const prop of Object.keys(spec.write(action.params, before))) prior[prop] = rawProp(before, id, prop);
      return { type: "source/setProps", params: { id, props: prior } };
    },
    fold: () => [],
  };
  return handler;
}

/** Register a handler and return it, for one-line namespace files. */
export function define<T extends ActionType>(handler: ActionHandler<T>): ActionHandler<T> {
  registerHandler(handler);
  return handler;
}
