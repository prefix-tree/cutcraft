import { type CollectedNode, INTERIOR_PREFIX } from "../resolve/tree";
import type { Json, NetPatch, Patch, PatchLog } from "./types";

export interface PatchLogOptions {
  /** Whether an id exists in the source tree the log sits on. Removing an inserted id that the source also has marks it removed instead of forgetting it. */
  readonly isSource?: (id: string) => boolean;
  /** The parent of a source node, so removing a node also drops what the log inserted deeper inside it. */
  readonly sourceParent?: (id: string) => string | null;
  /** A node of the source tree, so putting back a removed node as the source has it (an undone delete) keeps its text. */
  readonly sourceNode?: (id: string) => CollectedNode | undefined;
}

class Log implements PatchLog {
  private readonly list: Patch[] = [];
  private readonly reduced = new Map<string, NetPatch>();
  private v = 0;
  private readonly isSource: (id: string) => boolean;
  private readonly sourceParent: (id: string) => string | null;
  private readonly sourceNode: (id: string) => CollectedNode | undefined;

  constructor(options: PatchLogOptions) {
    this.isSource = options.isSource ?? (() => false);
    this.sourceParent = options.sourceParent ?? (() => null);
    this.sourceNode = options.sourceNode ?? (() => undefined);
  }

  get entries(): readonly Patch[] {
    return this.list;
  }
  get net(): ReadonlyMap<string, NetPatch> {
    return this.reduced;
  }
  get version(): number {
    return this.v;
  }

  append(patch: Patch): void {
    this.list.push(patch);
    reduceInto(this.reduced, patch, this.isSource, this.sourceParent, this.sourceNode);
    this.v += 1;
  }

  mark(): number {
    return this.list.length;
  }

  truncate(mark: number): void {
    if (mark >= this.list.length) return;
    this.list.length = Math.max(0, mark);
    this.reduced.clear();
    for (const p of this.list) reduceInto(this.reduced, p, this.isSource, this.sourceParent, this.sourceNode);
    this.v += 1;
  }

  clear(): void {
    this.list.length = 0;
    this.reduced.clear();
    this.v += 1;
  }
}

export function createPatchLog(options: PatchLogOptions = {}): PatchLog {
  return new Log(options);
}

/** Counts inserts and moves across every log, so places written later sort later. */
let placed = 0;

function entry(net: Map<string, NetPatch>, id: string): NetPatch {
  let e = net.get(id);
  if (!e) {
    e = { id, presence: "present", props: new Map(), bake: false };
    net.set(id, e);
  }
  return e;
}

/** Keep `net` reduced: last write wins per prop, structural ops collapse, removal of an insert vanishes. */
export function reduceInto(
  net: Map<string, NetPatch>,
  patch: Patch,
  isSource: (id: string) => boolean = () => false,
  sourceParent: (id: string) => string | null = () => null,
  sourceNode: (id: string) => CollectedNode | undefined = () => undefined,
): void {
  switch (patch.op) {
    case "set": {
      const e = entry(net, patch.id);
      if (e.presence === "removed") throw new Error(`patch set on removed element ${patch.id}`);
      e.props.set(patch.prop, patch.value);
      return;
    }
    case "text": {
      const e = entry(net, patch.id);
      if (e.presence === "removed") throw new Error(`patch text on removed element ${patch.id}`);
      e.text = patch.text;
      return;
    }
    case "move": {
      const e = entry(net, patch.id);
      if (e.presence === "removed") throw new Error(`patch move on removed element ${patch.id}`);
      e.place = { parent: patch.parent, after: patch.after, seq: placed++ };
      return;
    }
    case "remove": {
      dropPlacedWithin(net, patch.id, isSource, sourceParent);
      const e = net.get(patch.id);
      if (e?.presence === "inserted" && !isSource(patch.id)) {
        net.delete(patch.id);
        return;
      }
      const r = entry(net, patch.id);
      r.presence = "removed";
      r.props.clear();
      delete r.text;
      delete r.place;
      delete r.node;
      delete r.within;
      return;
    }
    case "insert": {
      const e = entry(net, patch.id);
      const source = sourceNode(patch.id);
      if (e.presence === "removed" && source && restores(source, patch.node)) {
        // The source node put back (an undone delete, the undo of a split): it is the source's element, moved to where
        // the insert puts it, with the props it had changed when it was removed. Its text in the file is kept.
        e.presence = "present";
        e.props.clear();
        delete e.text;
        delete e.node;
        delete e.within;
        changedProps(e, source, patch.node);
        e.place = { parent: patch.parent, after: patch.after, seq: placed++ };
        forgetRemovedWithin(net, source);
        return;
      }
      e.presence = "inserted";
      e.props.clear();
      delete e.within;
      e.node = patch.node;
      e.place = { parent: patch.parent, after: patch.after, seq: placed++ };
      revive(net, patch.node, patch.id, isSource);
      return;
    }
    case "bake": {
      entry(net, patch.id).bake = true;
      return;
    }
  }
}

/**
 * What the log put inside a node goes when the node goes: a key inserted into a clip, then the clip removed and put
 * back as it was (the undo of a split), must not come back with it. Inserted nodes are forgotten; source nodes moved in
 * are removed.
 */
function dropPlacedWithin(
  net: Map<string, NetPatch>,
  removed: string,
  isSource: (id: string) => boolean,
  sourceParent: (id: string) => string | null,
): void {
  /** Whether `parent` is the removed node or inside it, through the log's places and the source tree. */
  const inside = (parent: string): boolean => {
    const seen = new Set<string>();
    for (let at: string | null = parent; at !== null && !seen.has(at); ) {
      if (at === removed) return true;
      seen.add(at);
      const e = net.get(at);
      at = e?.place ? e.place.parent : e?.presence === "inserted" ? null : sourceParent(at);
    }
    return false;
  };
  for (const [id, e] of [...net]) {
    if (id === removed || !e.place || !inside(e.place.parent)) continue;
    if (e.presence === "inserted" && !isSource(id)) net.delete(id);
    else {
      e.presence = "removed";
      e.props.clear();
      delete e.text;
      delete e.place;
      delete e.node;
      delete e.within;
    }
  }
}

/**
 * Descendants of an inserted node that the log had removed are back, as the insert writes them: an undo of a split
 * removes the second half and puts the original clip back with the keyframes the split had moved out of it.
 */
function revive(
  net: Map<string, NetPatch>,
  node: CollectedNode,
  holder: string,
  isSource: (id: string) => boolean,
): void {
  for (const child of node.children) {
    const e = net.get(child.id);
    if (e?.presence === "removed") {
      if (isSource(child.id)) {
        e.presence = "present";
        e.props.clear();
        delete e.text;
        delete e.place;
        delete e.node;
        e.within = holder;
      } else net.delete(child.id);
    }
    revive(net, child, holder, isSource);
  }
}

/** Whether an inserted node is a source node with, at most, its own props and text changed: its children are as the source has them. */
function restores(source: CollectedNode, node: CollectedNode): boolean {
  return (
    source.kind === node.kind &&
    source.interior?.component === node.interior?.component &&
    source.children.length === node.children.length &&
    source.children.every((c, i) => nodesEqual(c, node.children[i] as CollectedNode))
  );
}

/** Set on `e` each prop, handle and the text in which `node` differs from `source`. */
function changedProps(e: NetPatch, source: CollectedNode, node: CollectedNode): void {
  const differ = (a: Readonly<Record<string, unknown>>, b: Readonly<Record<string, unknown>>, prefix: string) => {
    for (const k of new Set([...Object.keys(a), ...Object.keys(b)]))
      if (stableJson(a[k]) !== stableJson(b[k])) e.props.set(prefix + k, asJson(b[k]));
  };
  differ(source.props, node.props, "");
  if (source.interior && node.interior) differ(source.interior.props, node.interior.props, INTERIOR_PREFIX);
  if (node.text !== source.text && node.text !== undefined) e.text = node.text;
}

/** The source descendants of a node put back as the source has them are the source's again. */
function forgetRemovedWithin(net: Map<string, NetPatch>, source: CollectedNode): void {
  for (const child of source.children) {
    if (net.get(child.id)?.presence === "removed") net.delete(child.id);
    forgetRemovedWithin(net, child);
  }
}

export function nodesEqual(a: CollectedNode, b: CollectedNode): boolean {
  return (
    a.id === b.id &&
    a.kind === b.kind &&
    stableJson(a.props) === stableJson(b.props) &&
    a.text === b.text &&
    a.children.length === b.children.length &&
    a.children.every((c, i) => nodesEqual(c, b.children[i] as CollectedNode))
  );
}

export function stableJson(value: unknown): string {
  return JSON.stringify(value, (_k, v: unknown) =>
    v && typeof v === "object" && !Array.isArray(v)
      ? Object.fromEntries(Object.entries(v as Record<string, unknown>).sort(([a], [b]) => (a < b ? -1 : 1)))
      : v,
  );
}

export function asJson(value: unknown): Json | undefined {
  if (value === undefined) return undefined;
  return JSON.parse(JSON.stringify(value)) as Json;
}
