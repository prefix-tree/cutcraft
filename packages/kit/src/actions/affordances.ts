import { capabilitiesOf } from "../jsx/capabilities";
import type { ElementCapabilities } from "../jsx/define";
import type { ResolvedState } from "../resolve/resolve";
import type { Editable } from "../resolve/tree";
import { getHandler, listHandlers } from "./registry";
import type { ActionInput, ActionType } from "./types";

/** How a prop can be written: in the element (`literal`), into the file's `defaults` (`bound`), or not (`locked`). */
export type PropAccess = "literal" | "bound" | "locked";

/** What an editor or an agent may do to one element, before trying anything. */
export interface Affordances {
  readonly id: string;
  readonly kind: string;
  readonly editable: Editable;
  /** The track it sits on, if any, and whether that track is locked. */
  readonly track: { readonly id: string; readonly locked: boolean } | undefined;
  readonly capabilities: ElementCapabilities;
  /** Each prop the element has, and how it can be written. */
  readonly props: Readonly<Record<string, PropAccess>>;
  /**
   * The actions that can be offered on it: those whose target accepts this element. The action's other params are
   * still checked when it runs; ask `Executor.can()` for a definite answer.
   */
  readonly actions: readonly ActionType[];
}

/** What can be done to the element `id` in `state`, or undefined when there is no such element. */
export function affordances(state: ResolvedState, id: string): Affordances | undefined {
  const item = state.items.get(id);
  if (!item) return undefined;
  const track = item.track ? state.tracks.find((t) => t.id === item.track) : undefined;
  const props: Record<string, PropAccess> = {};
  for (const prop of Object.keys(item.props)) props[prop] = "literal";
  for (const prop of Object.keys(item.boundProps)) props[prop] = "bound";
  for (const prop of item.lockedProps) props[prop] = "locked";
  const actions = listHandlers().filter((type) => getHandler(type)?.targets?.accepts(item, state) === true);
  return {
    id,
    kind: item.kind,
    editable: item.editable,
    track: track ? { id: track.id, locked: track.locked } : undefined,
    capabilities: capabilitiesOf(item.kind),
    props,
    actions,
  };
}

/** The element an action is about, by its handler's `targets`, or undefined for an action that is about none. */
export function actionTarget(input: ActionInput): string | undefined {
  const target = getHandler(input.type)?.targets;
  if (!target) return undefined;
  const value = (input.params as Record<string, unknown>)[target.param];
  return typeof value === "string" ? value : undefined;
}
