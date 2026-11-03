import { asJson } from "../patches/log";
import type { Json, PatchLog } from "../patches/types";
import type { Placement as ResolvedPlacement, ResolvedState } from "../resolve/resolve";
import { INTERIOR_PREFIX, type CollectedNode } from "../resolve/tree";
import { registerHandler, type ActionHandler, type ApplyContext } from "./registry";
import {
  invalid,
  nodeOfSpec,
  ok,
  type Action,
  type ActionError,
  type ActionType,
  type NodeSpec,
  type PlacementSpec,
  type ValidationResult,
} from "./types";

export class NotImplemented extends Error {
  constructor(type: string) {
    super(`${type} is specified but not implemented yet`);
    this.name = "NotImplemented";
  }
}

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

export function requireLiteralProp(item: ResolvedPlacement, prop: string): ActionError | null {
  return item.lockedProps.includes(prop)
    ? { code: "LOCKED_PROP", message: `"${item.id}.${prop}" is an expression; bake it first`, path: prop }
    : null;
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

export function collectErrors(...errors: (ActionError | null | ResolvedPlacement | undefined)[]): ValidationResult {
  const list = errors.filter(
    (e): e is ActionError => Boolean(e) && "code" in (e as object) && "message" in (e as object),
  );
  return invalid(...list);
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

export function childIndex(state: ResolvedState, parent: string, childId: string): number {
  const node = rawNode(state, parent);
  return node ? node.children.findIndex((c) => c.id === childId) : -1;
}

export function childAt(state: ResolvedState, parent: string, index: number): string | null {
  const node = rawNode(state, parent);
  const child = node?.children[index];
  return child ? child.id : null;
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
}

/** An action that sets literal props on one element; the inverse sets the prior values. */
export function makePropHandler<T extends ActionType>(spec: PropHandlerSpec<T>): ActionHandler<T> {
  const target = spec.target ?? ((params: Params<T>) => (params as { id: string }).id);
  const handler: ActionHandler<T> = {
    type: spec.type,
    validate(action, state) {
      const id = target(action.params);
      const props = Object.keys(spec.write(action.params, state));
      const base = validateTarget(state, id, props);
      if (!base.valid) return base;
      const item = state.items.get(id);
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

export function stub<T extends ActionType>(
  type: T,
  validate: ActionHandler<T>["validate"],
  invert: ActionHandler<T>["invert"],
): ActionHandler<T> {
  return define<T>({
    type,
    validate,
    apply: () => {
      throw new NotImplemented(type);
    },
    invert,
    fold: () => [],
  });
}

export type { ApplyContext };
