import type { CollectedNode } from "../resolve/tree";
import type { Json, NetPatch, Patch, PatchLog } from "./types";

export interface PatchLogOptions {
  /** Whether an id exists in the source tree the log sits on. Removing an inserted id that the source also has marks it removed instead of forgetting it. */
  readonly isSource?: (id: string) => boolean;
}

class Log implements PatchLog {
  private readonly list: Patch[] = [];
  private readonly reduced = new Map<string, NetPatch>();
  private v = 0;
  private readonly isSource: (id: string) => boolean;

  constructor(options: PatchLogOptions) {
    this.isSource = options.isSource ?? (() => false);
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
    reduceInto(this.reduced, patch, this.isSource);
    this.v += 1;
  }

  mark(): number {
    return this.list.length;
  }

  truncate(mark: number): void {
    if (mark >= this.list.length) return;
    this.list.length = Math.max(0, mark);
    this.reduced.clear();
    for (const p of this.list) reduceInto(this.reduced, p, this.isSource);
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
      e.place = { parent: patch.parent, after: patch.after };
      return;
    }
    case "remove": {
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
      return;
    }
    case "insert": {
      const e = entry(net, patch.id);
      const sameAsSource = e.presence === "removed" && e.node !== undefined && nodesEqual(e.node, patch.node);
      e.presence = sameAsSource ? "present" : "inserted";
      e.props.clear();
      e.node = patch.node;
      e.place = { parent: patch.parent, after: patch.after };
      return;
    }
    case "bake": {
      entry(net, patch.id).bake = true;
      return;
    }
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
