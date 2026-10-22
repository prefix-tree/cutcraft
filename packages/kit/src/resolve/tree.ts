import type { ResolveError } from "./errors";

export type Editable = "literal" | "generated" | "opaque";

/**
 * One vocabulary element as collected from the React element tree, before
 * schema parsing and before placement. `props` are the raw JSX props minus
 * `children`.
 */
export interface CollectedNode {
  readonly id: string;
  readonly kind: string;
  readonly props: Readonly<Record<string, unknown>>;
  readonly children: readonly CollectedNode[];
  /** Text content for elements whose children are text (Title). */
  readonly text?: string;
  readonly parent: string | null;
  readonly editable: Editable;
  /** Props whose source value is an expression (known only when a SourceIndex was supplied). */
  readonly lockedProps: readonly string[];
  /** For helper output: which helper produced the node, under which parent, and the helper's nth use in the file. */
  readonly origin?: { readonly helper: string; readonly callerId: string | null; readonly callIndex: number };
}

export interface CollectedTree {
  readonly root: CollectedNode;
  readonly byId: ReadonlyMap<string, CollectedNode>;
  readonly errors: readonly ResolveError[];
}

export function walk(node: CollectedNode, visit: (node: CollectedNode, depth: number) => void, depth = 0): void {
  visit(node, depth);
  for (const child of node.children) walk(child, visit, depth + 1);
}

export function findParentOf(tree: CollectedTree, id: string): CollectedNode | null {
  const node = tree.byId.get(id);
  if (!node || node.parent === null) return null;
  return tree.byId.get(node.parent) ?? null;
}
