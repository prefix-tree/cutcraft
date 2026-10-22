import type { AssetManifest } from "../manifest/types";
import type { PatchLog } from "../patches/types";
import type { ResolvedState } from "../resolve/resolve";
import type { Action, ActionInput, ActionType, ValidationResult } from "./types";

/** Handed to `apply`: the state before the action, and a way to re-resolve mid-way (batch, split). */
export interface ApplyContext {
  readonly before: ResolvedState;
  readonly manifest: AssetManifest;
  /** Resolve the tree with the patches appended so far. */
  current(): ResolvedState;
}

/** Interface the fold step needs from the source index; the real type lives in source/index.ts. */
export interface FoldIndexLike {
  readonly text: string;
  readonly elements: ReadonlyMap<string, { readonly generated: boolean }>;
}

export interface SourceEditLike {
  readonly kind: string;
  readonly id: string;
  readonly range: readonly [number, number];
  readonly text: string;
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
  return Array.isArray(inv) ? { type: "batch/apply", params: { actions: inv as readonly ActionInput[] } } : (inv as ActionInput);
}
