import type { NetPatch, PatchLog } from "../patches/types";
import { INTERIOR_PREFIX, type CollectedNode, type CollectedTree } from "./tree";

/**
 * The collected tree with the patch log's net effect applied: removed nodes
 * dropped, inserted nodes placed, moved nodes relocated, props and text
 * overlaid. Returns the same tree when the log is empty.
 */
export function overlay(tree: CollectedTree, log: PatchLog | undefined): CollectedTree {
  if (!log || log.net.size === 0) return tree;
  const net = log.net;
  if (![...net.values()].some((n) => n.presence !== "present" || n.place !== undefined || n.bake))
    return overlayProps(tree, net);
  const byId = new Map<string, CollectedNode>();

  // Children added or moved under a parent, keyed by parent id.
  const additions = new Map<string, { after: string | null; node: CollectedNode }[]>();
  const movedAway = new Set<string>();
  for (const [id, n] of net) {
    if (n.presence === "inserted" && n.node && n.place) {
      // A remove followed by an insert of a different node under the same id replaces the original.
      if (tree.byId.has(id)) movedAway.add(id);
      push(additions, n.place.parent, { after: n.place.after, node: n.node });
    } else if (n.presence === "present" && n.place) {
      const original = tree.byId.get(id);
      if (original && original.parent !== n.place.parent) {
        movedAway.add(id);
        push(additions, n.place.parent, { after: n.place.after, node: original });
      } else if (original) {
        // Reorder within the same parent: treat as remove-then-add at the new spot.
        movedAway.add(id);
        push(additions, n.place.parent, { after: n.place.after, node: original });
      }
    }
  }

  const rebuild = (node: CollectedNode, parent: string | null): CollectedNode | null => {
    const n = net.get(node.id);
    if (n?.presence === "removed") return null;
    let props: Record<string, unknown> = node.props;
    let interior = node.interior;
    let text = node.text;
    if (n) {
      if (n.props.size > 0) ({ props, interior } = overlaidProps(node, n));
      if (n.text !== undefined) text = n.text;
    }
    const kept: CollectedNode[] = [];
    for (const child of node.children) {
      if (movedAway.has(child.id)) continue;
      const built = rebuild(child, node.id);
      if (built) kept.push(built);
    }
    const children = insertAdditions(kept, additions.get(node.id) ?? [], node.id, rebuild);
    const out: CollectedNode = {
      ...node,
      props,
      children,
      parent,
      ...(text !== undefined ? { text } : {}),
      ...(interior ? { interior } : {}),
    };
    byId.set(out.id, out);
    return out;
  };

  const root = rebuild(tree.root, null) ?? tree.root;
  return { root, byId, errors: tree.errors };
}

/**
 * The common case during a drag: only props or text changed. Rebuild the
 * patched nodes and their ancestors; every other node keeps its identity,
 * and with it its props object, so parsed props stay cached downstream.
 */
function overlayProps(tree: CollectedTree, net: ReadonlyMap<string, NetPatch>): CollectedTree {
  const dirty = new Set<string>();
  for (const [id, n] of net) {
    if (n.props.size === 0 && n.text === undefined) continue;
    for (let node = tree.byId.get(id); node; node = node.parent === null ? undefined : tree.byId.get(node.parent))
      dirty.add(node.id);
  }
  if (dirty.size === 0) return tree;
  const byId = new Map(tree.byId);
  const rebuild = (node: CollectedNode): CollectedNode => {
    if (!dirty.has(node.id)) return node;
    const n = net.get(node.id);
    let props = node.props;
    let interior = node.interior;
    let text = node.text;
    if (n && n.props.size > 0) ({ props, interior } = overlaidProps(node, n));
    if (n && n.text !== undefined) text = n.text;
    const out: CollectedNode = {
      ...node,
      props,
      children: node.children.map(rebuild),
      ...(text !== undefined ? { text } : {}),
      ...(interior ? { interior } : {}),
    };
    byId.set(out.id, out);
    return out;
  };
  return { root: rebuild(tree.root), byId, errors: tree.errors };
}

function push<T>(map: Map<string, T[]>, key: string, value: T): void {
  const list = map.get(key);
  if (list) list.push(value);
  else map.set(key, [value]);
}

function insertAdditions(
  children: CollectedNode[],
  additions: { after: string | null; node: CollectedNode }[],
  parent: string,
  rebuild: (node: CollectedNode, parent: string | null) => CollectedNode | null,
): CollectedNode[] {
  if (additions.length === 0) return children;
  const result = [...children];
  for (const { after, node } of additions) {
    const built = rebuild({ ...node, parent }, parent);
    if (!built) continue;
    const index = after === null ? -1 : result.findIndex((c) => c.id === after);
    result.splice(index + 1, 0, built);
  }
  return result;
}

/** Apply a net's prop writes: `interior.<name>` keys go to the Layer's handles, the rest to the node's own props. */
function overlaidProps(
  node: CollectedNode,
  n: NetPatch,
): { props: Record<string, unknown>; interior: CollectedNode["interior"] } {
  const props: Record<string, unknown> = { ...node.props };
  let handles: Record<string, unknown> | null = null;
  for (const [k, v] of n.props) {
    const target = k.startsWith(INTERIOR_PREFIX) ? (handles ??= { ...(node.interior?.props ?? {}) }) : props;
    const key = k.startsWith(INTERIOR_PREFIX) ? k.slice(INTERIOR_PREFIX.length) : k;
    if (v === undefined) delete target[key];
    else target[key] = v;
  }
  const interior = handles && node.interior ? { component: node.interior.component, props: handles } : node.interior;
  return { props, interior };
}
