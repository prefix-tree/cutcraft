import { define, insertNode, isError, makePropHandler, rawNode, rawProp, requireElement, setProps, stub } from "../handler-kit";
import { invalid, nodeSpecOf, ok, type ActionInput } from "../types";

function trackIndex(state: Parameters<typeof rawNode>[0], trackId: string): number {
  return state.tree.root.children.findIndex((c) => c.id === trackId);
}

define({
  type: "track/add",
  validate: (a, state) => (state.items.has(a.params.trackId) || state.tree.byId.has(a.params.trackId)
    ? invalid({ code: "DUPLICATE_ID", message: `"${a.params.trackId}" exists` }) : ok),
  apply: (a, log, ctx) => {
    const tracks = ctx.before.tree.root.children.filter((c) => c.kind === "track");
    const pos = a.params.position ?? tracks.length;
    const after = pos <= 0 ? null : (tracks[Math.min(pos, tracks.length) - 1]?.id ?? null);
    const props: Record<string, never> = { id: a.params.trackId } as never;
    const p = props as Record<string, unknown>;
    if (a.params.layout) p.layout = a.params.layout;
    if (a.params.role) p.role = a.params.role;
    if (a.params.name) p.name = a.params.name;
    insertNode(log, "composition", after, { id: a.params.trackId, kind: "track", props, children: [] });
  },
  invert: (a) => ({ type: "track/remove", params: { trackId: a.params.trackId } }),
  fold: () => [],
});

define({
  type: "track/remove",
  validate: (a, state) => (rawNode(state, a.params.trackId)?.kind === "track" ? ok : invalid({ code: "ELEMENT_NOT_FOUND", message: `track "${a.params.trackId}" does not exist` })),
  apply: (a, log) => log.append({ op: "remove", id: a.params.trackId }),
  invert: (a, before) => ({ type: "track/restore", params: { trackId: a.params.trackId, node: nodeSpecOf(rawNode(before, a.params.trackId)!), position: trackIndex(before, a.params.trackId) } }),
  fold: () => [],
});

define({
  type: "track/restore",
  validate: (a, state) => (rawNode(state, a.params.trackId) ? invalid({ code: "DUPLICATE_ID", message: `"${a.params.trackId}" exists` }) : ok),
  apply: (a, log, ctx) => {
    const siblings = ctx.before.tree.root.children;
    const after = a.params.position <= 0 ? null : (siblings[a.params.position - 1]?.id ?? null);
    insertNode(log, "composition", after, a.params.node);
  },
  invert: (a) => ({ type: "track/remove", params: { trackId: a.params.trackId } }),
  fold: () => [],
});

define({
  type: "track/duplicate",
  validate: (a, state) => {
    if (rawNode(state, a.params.sourceTrackId)?.kind !== "track") return invalid({ code: "ELEMENT_NOT_FOUND", message: "source track does not exist" });
    if (rawNode(state, a.params.trackId)) return invalid({ code: "DUPLICATE_ID", message: `"${a.params.trackId}" exists` });
    return ok;
  },
  apply: (a, log, ctx) => {
    const source = rawNode(ctx.before, a.params.sourceTrackId)!;
    const map = a.params.idMap;
    const remap = (id: string): string => map[id] ?? `${id}_${a.params.trackId}`;
    const copy = (spec: ReturnType<typeof nodeSpecOf>): ReturnType<typeof nodeSpecOf> => ({
      ...spec,
      id: spec.id === source.id ? a.params.trackId : remap(spec.id),
      props: Object.fromEntries(Object.entries(spec.props).map(([k, v]) => [k, k === "id" ? (spec.id === source.id ? a.params.trackId : remap(spec.id)) : (k === "anchor" || k === "on") && typeof v === "string" && map[v] ? map[v] : v])),
      children: (spec.children ?? []).map(copy),
    });
    const pos = a.params.position ?? trackIndex(ctx.before, source.id) + 1;
    const siblings = ctx.before.tree.root.children;
    const after = pos <= 0 ? null : (siblings[pos - 1]?.id ?? null);
    const spec = copy(nodeSpecOf(source));
    insertNode(log, "composition", after, { ...spec, props: { ...spec.props, name: `${String(source.props.name ?? source.id)} Copy` } });
  },
  invert: (a) => ({ type: "track/remove", params: { trackId: a.params.trackId } }),
  fold: () => [],
});

define(makePropHandler({ type: "track/rename", target: (p) => p.trackId, write: (p) => ({ name: p.name }), kinds: ["track"] }));
define(makePropHandler({ type: "track/setFlag", target: (p) => p.trackId, write: (p) => ({ [p.flag]: p.value }), kinds: ["track"] }));
define(makePropHandler({ type: "track/setGroup", target: (p) => p.trackId, write: (p) => ({ group: p.group }), kinds: ["track"] }));

define({
  type: "track/reorder",
  validate: (a, state) => (rawNode(state, a.params.trackId)?.kind === "track" ? ok : invalid({ code: "ELEMENT_NOT_FOUND", message: "track does not exist" })),
  apply: (a, log, ctx) => {
    const siblings = ctx.before.tree.root.children.filter((c) => c.id !== a.params.trackId);
    const pos = Math.max(0, Math.min(a.params.position, siblings.length));
    const after = pos === 0 ? null : (siblings[pos - 1]?.id ?? null);
    log.append({ op: "move", id: a.params.trackId, parent: "composition", after });
  },
  invert: (a, before) => ({ type: "track/reorder", params: { trackId: a.params.trackId, position: trackIndex(before, a.params.trackId) } }),
  fold: () => [],
});

/** Free layout only: pack every timed child from 0 with no gaps, preserving order by start. */
define({
  type: "track/consolidate",
  validate: (a, state) => {
    const track = state.tracks.find((t) => t.id === a.params.trackId);
    if (!track) return invalid({ code: "ELEMENT_NOT_FOUND", message: "track does not exist" });
    if (track.layout !== "free") return invalid({ code: "UNSUPPORTED_ON_LAYOUT", message: "sequence tracks have no gaps to remove" });
    if (track.locked) return invalid({ code: "TRACK_LOCKED", message: "track is locked" });
    return ok;
  },
  apply: (a, log, ctx) => {
    let cursor = 0;
    for (const item of orderedItems(ctx.before, a.params.trackId)) {
      setProps(log, item.id, { start: cursor });
      cursor += item.duration;
    }
  },
  invert: (a, before) => ({ type: "track/restorePositions", params: { trackId: a.params.trackId, positions: orderedItems(before, a.params.trackId).map((i) => ({ id: i.id, start: i.start })) } }),
  fold: () => [],
});

define({
  type: "track/restorePositions",
  validate: (a, state) => {
    for (const p of a.params.positions) {
      const item = requireElement(state, p.id);
      if (isError(item)) return invalid(item);
    }
    return ok;
  },
  apply: (a, log) => { for (const p of a.params.positions) setProps(log, p.id, { start: p.start }); },
  invert: (a, before) => ({ type: "track/restorePositions", params: { trackId: a.params.trackId, positions: a.params.positions.map((p) => ({ id: p.id, start: Number(rawProp(before, p.id, "start") ?? 0) })) } }),
  fold: () => [],
});

stub("track/setLayout",
  (a, state) => (rawNode(state, a.params.trackId)?.kind === "track" ? ok : invalid({ code: "ELEMENT_NOT_FOUND", message: "track does not exist" })),
  (a, before): ActionInput => ({ type: "track/setLayout", params: { trackId: a.params.trackId, layout: (rawProp(before, a.params.trackId, "layout") as "sequence" | "free" | undefined) ?? "sequence" } }),
);

function orderedItems(state: Parameters<typeof rawNode>[0], trackId: string) {
  const track = state.tracks.find((t) => t.id === trackId);
  if (!track) return [];
  return track.items
    .map((id) => state.items.get(id))
    .filter((i): i is NonNullable<typeof i> => Boolean(i) && i!.kind !== "transition" && typeof rawProp(state, i!.id, "anchor") !== "string")
    .sort((x, y) => x.start - y.start);
}
