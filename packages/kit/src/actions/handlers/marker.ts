import { define, insertNode, makePropHandler, rawNode, siblingAfter } from "../handler-kit";
import { invalid, nodeOfSpec, nodeSpecOf, ok } from "../types";
import type { Json } from "../../patches/types";

define({
  type: "marker/add",
  validate: (a, state) => {
    if (state.tree.byId.has(a.params.markerId)) return invalid({ code: "DUPLICATE_ID", message: `"${a.params.markerId}" exists` });
    return a.params.at >= 0 ? ok : invalid({ code: "INVALID_TIME_RANGE", message: "markers sit at or after 0" });
  },
  apply: (a, log, ctx) => {
    const props: Record<string, Json> = { id: a.params.markerId, at: a.params.at };
    if (a.params.label !== undefined) props.label = a.params.label;
    if (a.params.color !== undefined) props.color = a.params.color;
    const markers = ctx.before.tree.root.children.filter((c) => c.kind === "marker");
    const after = markers[markers.length - 1]?.id ?? null;
    insertNode(log, "composition", after, { id: a.params.markerId, kind: "marker", props });
  },
  invert: (a) => ({ type: "marker/remove", params: { markerId: a.params.markerId } }),
  fold: () => [],
});

define(makePropHandler({
  type: "marker/update",
  target: (p) => p.markerId,
  kinds: ["marker"],
  write: (p) => ({ ...(p.at !== undefined ? { at: p.at } : {}), ...(p.label !== undefined ? { label: p.label } : {}), ...(p.color !== undefined ? { color: p.color } : {}) }),
}));

define({
  type: "marker/remove",
  validate: (a, state) => (rawNode(state, a.params.markerId)?.kind === "marker" ? ok : invalid({ code: "ELEMENT_NOT_FOUND", message: `marker "${a.params.markerId}" does not exist` })),
  apply: (a, log) => log.append({ op: "remove", id: a.params.markerId }),
  invert: (a, before) => ({ type: "marker/restore", params: { node: nodeSpecOf(rawNode(before, a.params.markerId)!), after: siblingAfter(before, a.params.markerId) } }),
  fold: () => [],
});

define({
  type: "marker/restore",
  validate: (a, state) => (state.tree.byId.has(a.params.node.id) ? invalid({ code: "DUPLICATE_ID", message: `"${a.params.node.id}" exists` }) : ok),
  apply: (a, log) => log.append({ op: "insert", id: a.params.node.id, parent: "composition", after: a.params.after, node: nodeOfSpec({ ...a.params.node, kind: "marker" }, "composition") }),
  invert: (a) => ({ type: "marker/remove", params: { markerId: a.params.node.id } }),
  fold: () => [],
});
