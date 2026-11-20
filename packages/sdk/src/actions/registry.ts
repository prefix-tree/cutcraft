import type { AssetManifest } from "../manifest/types";
import type { PatchLog } from "../patches/types";
import type { Placement, ResolvedState } from "../resolve/resolve";
import type { Action, ActionInput, ActionType, ValidationResult } from "./types";

/** Handed to `apply`: the state before the action, and a way to re-resolve mid-way (batch, split). */
export interface ApplyContext {
  readonly before: ResolvedState;
  readonly manifest: AssetManifest;
  /** Resolve the tree with the patches appended so far. */
  current(): ResolvedState;
}

/** Interface the fold step needs from the source index; the real type lives in source/index.ts. */
interface FoldIndexLike {
  readonly text: string;
  readonly elements: ReadonlyMap<string, { readonly generated: boolean }>;
}

interface SourceEditLike {
  readonly kind: string;
  readonly id: string;
  readonly range: readonly [number, number];
  readonly text: string;
}

/**
 * What an action is about, when it is about one element already in the file: the param that names it, and whether
 * the action can be offered on a given element. `accepts` is the half of `validate` that depends on the element alone
 * (its kind, its track's lock, whether it is written in the file); the action's other params are still checked when
 * it runs. `affordances()` lists the actions whose target accepts an element.
 */
export interface ElementTarget {
  readonly param: string;
  accepts(item: Placement, state: ResolvedState): boolean;
}

/**
 * The four faces of an action. `apply` only appends patches; `invert` is
 * computed against the state before the action and is never null; `fold`
 * returns [] when the generic fold (from the net patch) is enough.
 */
export interface ActionHandler<T extends ActionType = ActionType> {
  readonly type: T;
  validate(action: Action<T>, state: ResolvedState): ValidationResult;
  apply(action: Action<T>, log: PatchLog, ctx: ApplyContext): void;
  invert(action: Action<T>, before: ResolvedState): ActionInput | readonly ActionInput[];
  fold(action: Action<T>, index: FoldIndexLike, state: ResolvedState): readonly SourceEditLike[];
  /** The element the action is about, for actions that act on one; absent for the rest. */
  readonly targets?: ElementTarget;
}

const registry = new Map<ActionType, ActionHandler>();

export function registerHandler<T extends ActionType>(handler: ActionHandler<T>): void {
  if (registry.has(handler.type)) throw new Error(`handler for ${handler.type} registered twice`);
  registry.set(handler.type, handler as unknown as ActionHandler);
}

export function getHandler<T extends ActionType>(type: T): ActionHandler<T> | undefined {
  return registry.get(type) as ActionHandler<T> | undefined;
}

export function listHandlers(): ActionType[] {
  return [...registry.keys()].sort();
}

export function inverseOf<T extends ActionType>(action: Action<T>, before: ResolvedState): ActionInput {
  const handler = getHandler(action.type);
  if (!handler) throw new Error(`no handler for ${action.type}`);
  const inv = handler.invert(action, before);
  return Array.isArray(inv)
    ? { type: "batch/apply", params: { actions: inv as readonly ActionInput[] } }
    : (inv as ActionInput);
}
