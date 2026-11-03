import {
  define,
  insertNode,
  makePropHandler,
  rawNode,
  rawProp,
  setProps,
  siblingAfter,
  validateTarget,
} from "../handler-kit";
import { invalid, nodeOfSpec, nodeSpecOf, ok, type ActionError, type ActionInput } from "../types";
import { childrenOfKind, replaceAll, stackPosition } from "./effect";
import type { ResolvedState } from "../../resolve/resolve";
import type { Json, PatchLog } from "../../patches/types";

function requireCaptions(state: ResolvedState, id: string): ActionError | null {
  return rawNode(state, id)?.kind === "captions"
    ? null
    : { code: "ELEMENT_NOT_FOUND", message: `<Captions id="${id}"> does not exist`, path: "captionsId" };
}

function requireCaption(state: ResolvedState, id: string): ActionError | null {
  return state.items.get(id)?.kind === "caption"
    ? null
    : { code: "ELEMENT_NOT_FOUND", message: `caption "${id}" does not exist`, path: "captionId" };
}

/** The cues <Captions src> generated for this element, in time order; empty once literal cues exist. */
function generatedCues(state: ResolvedState, captionsId: string) {
  return [...state.items.values()]
    .filter(
      (p) =>
        p.parent === captionsId && p.kind === "caption" && p.editable === "generated" && !state.tree.byId.has(p.id),
    )
    .sort((a, b) => a.start - b.start);
}

/**
 * Editing a generated cue makes every cue literal first: the file then says
 * what the transcript said, and the edit applies to one line of it. Undo is
 * `caption/setAll` with no nodes, which removes the literals so generation
 * resumes.
 */
function materializeCues(log: PatchLog, state: ResolvedState, captionsId: string): void {
  let after: string | null = null;
  for (const cue of generatedCues(state, captionsId)) {
    const props = JSON.parse(JSON.stringify(cue.props)) as Record<string, Json>;
    log.append({
      op: "insert",
      id: cue.id,
      parent: captionsId,
      after,
      node: nodeOfSpec({ id: cue.id, kind: "caption", props }, captionsId),
    });
    after = cue.id;
  }
}

function isGeneratedCue(state: ResolvedState, id: string): boolean {
  const p = state.items.get(id);
  return Boolean(p && p.kind === "caption" && p.editable === "generated" && !state.tree.byId.has(id));
}

function regenerate(captionsId: string): ActionInput {
  return { type: "caption/setAll", params: { captionsId, nodes: [] } };
}

/** Create the composition's <Captions>, or replace its items. */
define({
  type: "caption/import",
  validate: (a, state) => {
    const existing = state.tree.root.children.find((c) => c.kind === "captions");
    if (existing && existing.id !== a.params.captionsId)
      return invalid({ code: "DUPLICATE_ID", message: "a composition has one <Captions>; use its id" });
    return a.params.src || a.params.items ? ok : invalid({ code: "INVALID_PARAMS", message: "give src or items" });
  },
  apply: (a, log, ctx) => {
    const existing = rawNode(ctx.before, a.params.captionsId);
    if (!existing) {
      const props: Record<string, Json> = { id: a.params.captionsId };
      if (a.params.src) props.src = a.params.src;
      const last = ctx.before.tree.root.children[ctx.before.tree.root.children.length - 1];
      insertNode(log, "composition", last ? last.id : null, {
        id: a.params.captionsId,
        kind: "captions",
        props,
        children: (a.params.items ?? []).map((i) => ({ ...i, kind: "caption" })),
      });
      return;
    }
    if (a.params.src) setProps(log, a.params.captionsId, { src: a.params.src });
    if (a.params.items) replaceAll(log, ctx.before, a.params.captionsId, "caption", a.params.items);
  },
  invert: (a, before) => {
    const existing = rawNode(before, a.params.captionsId);
    if (!existing) return { type: "caption/setAll", params: { captionsId: a.params.captionsId, nodes: [] } };
    return {
      type: "caption/import",
      params: {
        captionsId: a.params.captionsId,
        ...(typeof existing.props.src === "string" ? { src: existing.props.src } : {}),
        items: childrenOfKind(before, a.params.captionsId, "caption").map(nodeSpecOf),
      },
    };
  },
  fold: () => [],
});

define({
  type: "caption/add",
  validate: (a, state) => {
    const e = requireCaptions(state, a.params.captionsId);
    if (e) return invalid(e);
    if (state.tree.byId.has(a.params.captionId))
      return invalid({ code: "DUPLICATE_ID", message: `"${a.params.captionId}" exists` });
    return ok;
  },
  apply: (a, log, ctx) => {
    const generated = generatedCues(ctx.before, a.params.captionsId);
    materializeCues(log, ctx.before, a.params.captionsId);
    const props: Record<string, Json> = {
      id: a.params.captionId,
      start: a.params.start,
      end: a.params.end,
      text: a.params.text,
    };
    if (a.params.words !== undefined) props.words = a.params.words;
    const siblings =
      generated.length > 0
        ? generated.map((c) => ({ id: c.id, props: c.props }))
        : childrenOfKind(ctx.before, a.params.captionsId, "caption");
    const after = siblings.filter((c) => Number(c.props.start) <= Number(a.params.start)).pop()?.id ?? null;
    log.append({
      op: "insert",
      id: a.params.captionId,
      parent: a.params.captionsId,
      after,
      node: nodeOfSpec({ id: a.params.captionId, kind: "caption", props }, a.params.captionsId),
    });
  },
  invert: (a, before) =>
    generatedCues(before, a.params.captionsId).length > 0
      ? regenerate(a.params.captionsId)
      : { type: "caption/remove", params: { captionId: a.params.captionId } },
  fold: () => [],
});

const updateWrites = (p: {
  text?: string;
  start?: Json;
  end?: Json;
  words?: Json;
}): Record<string, Json | undefined> => ({
  ...(p.text !== undefined ? { text: p.text } : {}),
  ...(p.start !== undefined ? { start: p.start } : {}),
  ...(p.end !== undefined ? { end: p.end } : {}),
  ...(p.words !== undefined ? { words: p.words } : {}),
});

define({
  type: "caption/update",
  validate: (a, state) => {
    const base = validateTarget(state, a.params.captionId, Object.keys(updateWrites(a.params)));
    if (!base.valid) return base;
    return state.items.get(a.params.captionId)?.kind === "caption"
      ? ok
      : invalid({ code: "INVALID_PARAMS", message: `"${a.params.captionId}" is not a <Caption>` });
  },
  apply: (a, log, ctx) => {
    const item = ctx.before.items.get(a.params.captionId)!;
    if (isGeneratedCue(ctx.before, a.params.captionId)) materializeCues(log, ctx.before, item.parent as string);
    setProps(log, a.params.captionId, updateWrites(a.params));
  },
  invert: (a, before) => {
    const item = before.items.get(a.params.captionId)!;
    if (isGeneratedCue(before, a.params.captionId)) return regenerate(item.parent as string);
    const prior: Record<string, Json | undefined> = {};
    for (const prop of Object.keys(updateWrites(a.params))) prior[prop] = rawProp(before, a.params.captionId, prop);
    return { type: "source/setProps", params: { id: a.params.captionId, props: prior } };
  },
  fold: () => [],
});

define({
  type: "caption/remove",
  validate: (a, state) => {
    const e = requireCaption(state, a.params.captionId);
    return e ? invalid(e) : validateTarget(state, a.params.captionId, []);
  },
  apply: (a, log, ctx) => {
    const item = ctx.before.items.get(a.params.captionId)!;
    if (isGeneratedCue(ctx.before, a.params.captionId)) materializeCues(log, ctx.before, item.parent as string);
    log.append({ op: "remove", id: a.params.captionId });
  },
  invert: (a, before) => {
    if (isGeneratedCue(before, a.params.captionId))
      return regenerate(before.items.get(a.params.captionId)!.parent as string);
    const node = rawNode(before, a.params.captionId)!;
    return {
      type: "caption/restore",
      params: {
        captionsId: node.parent as string,
        node: nodeSpecOf(node),
        after: siblingAfter(before, a.params.captionId),
      },
    };
  },
  fold: () => [],
});

define({
  type: "caption/restore",
  validate: (a, state) =>
    state.tree.byId.has(a.params.node.id)
      ? invalid({ code: "DUPLICATE_ID", message: `"${a.params.node.id}" exists` })
      : requireCaptions(state, a.params.captionsId)
        ? invalid(requireCaptions(state, a.params.captionsId)!)
        : ok,
  apply: (a, log) =>
    log.append({
      op: "insert",
      id: a.params.node.id,
      parent: a.params.captionsId,
      after: a.params.after,
      node: nodeOfSpec({ ...a.params.node, kind: "caption" }, a.params.captionsId),
    }),
  invert: (a) => ({ type: "caption/remove", params: { captionId: a.params.node.id } }),
  fold: () => [],
});

define(makePropHandler({
  type: "caption/setStyle",
  target: (p) => p.captionsId,
  kinds: ["captions"],
  write: (p) => ({ style: p.style as Json | undefined }),
}));
define(makePropHandler({
  type: "caption/setAnimation",
  target: (p) => p.captionsId,
  kinds: ["captions"],
  write: (p) => ({ animation: p.animation }),
}));

define({
  type: "caption/setAll",
  validate: (a, state) => {
    const e = requireCaptions(state, a.params.captionsId);
    return e ? invalid(e) : ok;
  },
  apply: (a, log, ctx) => replaceAll(log, ctx.before, a.params.captionsId, "caption", a.params.nodes, a.params.after),
  invert: (a, before) => ({
    type: "caption/setAll",
    params: {
      captionsId: a.params.captionsId,
      nodes: childrenOfKind(before, a.params.captionsId, "caption").map(nodeSpecOf),
      after: stackPosition(before, a.params.captionsId, "caption"),
    },
  }),
  fold: () => [],
});

export { rawProp };
