import { define, insertNode, makePropHandler, rawNode, rawProp, setProps, siblingAfter, validateTarget } from "../handler-kit";
import { invalid, nodeOfSpec, nodeSpecOf, ok, type ActionError } from "../types";
import { childrenOfKind, replaceAll, stackPosition } from "./effect";
import type { ResolvedState } from "../../resolve/resolve";
import type { Json } from "../../patches/types";

function requireCaptions(state: ResolvedState, id: string): ActionError | null {
  return rawNode(state, id)?.kind === "captions" ? null : { code: "ELEMENT_NOT_FOUND", message: `<Captions id="${id}"> does not exist`, path: "captionsId" };
}

function requireCaption(state: ResolvedState, id: string): ActionError | null {
  return rawNode(state, id)?.kind === "caption" ? null : { code: "ELEMENT_NOT_FOUND", message: `caption "${id}" does not exist`, path: "captionId" };
}

/** Create the composition's <Captions>, or replace its items. */
define({
  type: "caption/import",
  validate: (a, state) => {
    const existing = state.tree.root.children.find((c) => c.kind === "captions");
    if (existing && existing.id !== a.params.captionsId) return invalid({ code: "DUPLICATE_ID", message: "a composition has one <Captions>; use its id" });
    return a.params.src || a.params.items ? ok : invalid({ code: "INVALID_PARAMS", message: "give src or items" });
  },
  apply: (a, log, ctx) => {
    const existing = rawNode(ctx.before, a.params.captionsId);
    if (!existing) {
      const props: Record<string, Json> = { id: a.params.captionsId };
      if (a.params.src) props.src = a.params.src;
      const last = ctx.before.tree.root.children[ctx.before.tree.root.children.length - 1];
      insertNode(log, "composition", last ? last.id : null, { id: a.params.captionsId, kind: "captions", props, children: (a.params.items ?? []).map((i) => ({ ...i, kind: "caption" })) });
      return;
    }
    if (a.params.src) setProps(log, a.params.captionsId, { src: a.params.src });
    if (a.params.items) replaceAll(log, ctx.before, a.params.captionsId, "caption", a.params.items);
  },
  invert: (a, before) => {
    const existing = rawNode(before, a.params.captionsId);
    if (!existing) return { type: "caption/setAll", params: { captionsId: a.params.captionsId, nodes: [] } };
    return { type: "caption/import", params: { captionsId: a.params.captionsId, ...(typeof existing.props.src === "string" ? { src: existing.props.src } : {}), items: childrenOfKind(before, a.params.captionsId, "caption").map(nodeSpecOf) } };
  },
  fold: () => [],
});

define({
  type: "caption/add",
  validate: (a, state) => {
    const e = requireCaptions(state, a.params.captionsId);
    if (e) return invalid(e);
    if (state.tree.byId.has(a.params.captionId)) return invalid({ code: "DUPLICATE_ID", message: `"${a.params.captionId}" exists` });
    return ok;
  },
  apply: (a, log, ctx) => {
    const props: Record<string, Json> = { id: a.params.captionId, start: a.params.start, end: a.params.end, text: a.params.text };
    if (a.params.words !== undefined) props.words = a.params.words;
    const siblings = childrenOfKind(ctx.before, a.params.captionsId, "caption");
    const after = siblings.filter((c) => Number(c.props.start) <= Number(a.params.start)).pop()?.id ?? null;
    log.append({ op: "insert", id: a.params.captionId, parent: a.params.captionsId, after, node: nodeOfSpec({ id: a.params.captionId, kind: "caption", props }, a.params.captionsId) });
  },
  invert: (a) => ({ type: "caption/remove", params: { captionId: a.params.captionId } }),
  fold: () => [],
});

define(makePropHandler({
  type: "caption/update",
  target: (p) => p.captionId,
  kinds: ["caption"],
  write: (p) => ({ ...(p.text !== undefined ? { text: p.text } : {}), ...(p.start !== undefined ? { start: p.start } : {}), ...(p.end !== undefined ? { end: p.end } : {}), ...(p.words !== undefined ? { words: p.words } : {}) }),
}));

define({
  type: "caption/remove",
  validate: (a, state) => { const e = requireCaption(state, a.params.captionId); return e ? invalid(e) : validateTarget(state, a.params.captionId, []); },
  apply: (a, log) => log.append({ op: "remove", id: a.params.captionId }),
  invert: (a, before) => {
    const node = rawNode(before, a.params.captionId)!;
    return { type: "caption/restore", params: { captionsId: node.parent as string, node: nodeSpecOf(node), after: siblingAfter(before, a.params.captionId) } };
  },
  fold: () => [],
});

define({
  type: "caption/restore",
  validate: (a, state) => (state.tree.byId.has(a.params.node.id) ? invalid({ code: "DUPLICATE_ID", message: `"${a.params.node.id}" exists` }) : (requireCaptions(state, a.params.captionsId) ? invalid(requireCaptions(state, a.params.captionsId)!) : ok)),
  apply: (a, log) => log.append({ op: "insert", id: a.params.node.id, parent: a.params.captionsId, after: a.params.after, node: nodeOfSpec({ ...a.params.node, kind: "caption" }, a.params.captionsId) }),
  invert: (a) => ({ type: "caption/remove", params: { captionId: a.params.node.id } }),
  fold: () => [],
});

define(makePropHandler({ type: "caption/setStyle", target: (p) => p.captionsId, kinds: ["captions"], write: (p) => ({ style: p.style as Json | undefined }) }));
define(makePropHandler({ type: "caption/setAnimation", target: (p) => p.captionsId, kinds: ["captions"], write: (p) => ({ animation: p.animation }) }));

define({
  type: "caption/setAll",
  validate: (a, state) => { const e = requireCaptions(state, a.params.captionsId); return e ? invalid(e) : ok; },
  apply: (a, log, ctx) => replaceAll(log, ctx.before, a.params.captionsId, "caption", a.params.nodes, a.params.after),
  invert: (a, before) => ({ type: "caption/setAll", params: { captionsId: a.params.captionsId, nodes: childrenOfKind(before, a.params.captionsId, "caption").map(nodeSpecOf), after: stackPosition(before, a.params.captionsId, "caption") } }),
  fold: () => [],
});

export { rawProp };
