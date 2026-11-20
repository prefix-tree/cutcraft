// Children kept as an ordered collection under one element: the captions' cues.
import type { PatchLog } from "../../patches/types";
import type { ResolvedState } from "../../resolve/resolve";
import { rawNode, siblingAfter } from "../handler-kit";
import { type ActionError, type NodeSpec, nodeOfSpec } from "../types";

export function childrenOfKind(state: ResolvedState, parentId: string, kind: string) {
  return (rawNode(state, parentId)?.children ?? []).filter((c) => c.kind === kind);
}

export function requireChild(
  state: ResolvedState,
  parentId: string,
  childId: string,
  kind: string,
): ActionError | null {
  const child = rawNode(state, childId);
  if (!child || child.parent !== parentId || child.kind !== kind)
    return {
      code: "ELEMENT_NOT_FOUND",
      message: `${kind} "${childId}" is not a child of "${parentId}"`,
      path: "childId",
    };
  return null;
}

/** Where a replaced collection sits: where its first member was, or after the other children when there was none. */
export function stackPosition(state: ResolvedState, parentId: string, kind: string): string | null {
  const first = childrenOfKind(state, parentId, kind)[0];
  return first ? siblingAfter(state, first.id) : lastNonStack(state, parentId, kind);
}

export function replaceAll(
  log: PatchLog,
  state: ResolvedState,
  parentId: string,
  kind: string,
  specs: readonly NodeSpec[],
  afterOverride?: string | null,
): void {
  const node = rawNode(state, parentId)!;
  let after: string | null = afterOverride !== undefined ? afterOverride : stackPosition(state, parentId, kind);
  for (const c of node.children) if (c.kind === kind) log.append({ op: "remove", id: c.id });
  for (const spec of specs) {
    log.append({ op: "insert", id: spec.id, parent: parentId, after, node: nodeOfSpec({ ...spec, kind }, parentId) });
    after = spec.id;
  }
}

export function lastNonStack(state: ResolvedState, parentId: string, kind: string): string | null {
  // Stacks are kept after the non-stack children so prop edits never reorder siblings of other kinds.
  const node = rawNode(state, parentId);
  const others = (node?.children ?? []).filter((c) => c.kind !== kind);
  const last = others[others.length - 1];
  return last ? last.id : null;
}
