import { capabilitiesOf } from "../../jsx/capabilities";
import type { Json } from "../../patches/types";
import {
  define,
  isError,
  rawNode,
  rawProp,
  requireElement,
  setProps,
  siblingAfter,
  validateTarget,
} from "../handler-kit";
import { invalid, nodeOfSpec, nodeSpecOf, ok } from "../types";
import { lastNonStack } from "./effect";

define({
  type: "mask/create",
  validate: (a, state) => {
    if (state.tree.byId.has(a.params.id)) return invalid({ code: "DUPLICATE_ID", message: `"${a.params.id}" exists` });
    const parent = requireElement(state, a.params.parentId, "parentId");
    if (isError(parent)) return invalid(parent);
    return capabilitiesOf(parent.kind).visual
      ? ok
      : invalid({ code: "INVALID_PARAMS", message: `<${parent.kind}> cannot carry a mask` });
  },
  apply: (a, log, ctx) =>
    log.append({
      op: "insert",
      id: a.params.id,
      parent: a.params.parentId,
      after: lastNonStack(ctx.before, a.params.parentId, "mask"),
      node: nodeOfSpec(
        { id: a.params.id, kind: "mask", props: { ...a.params.props, id: a.params.id } },
        a.params.parentId,
      ),
    }),
  invert: (a) => ({ type: "mask/remove", params: { id: a.params.id } }),
  fold: () => [],
});

define({
  type: "mask/update",
  validate: (a, state) => {
    const base = validateTarget(state, a.params.id, Object.keys(a.params.props));
    if (!base.valid) return base;
    return state.items.get(a.params.id)!.kind === "mask"
      ? ok
      : invalid({ code: "INVALID_PARAMS", message: "not a mask" });
  },
  apply: (a, log) => setProps(log, a.params.id, a.params.props),
  invert: (a, before) => {
    const prior: Record<string, Json | undefined> = {};
    for (const prop of Object.keys(a.params.props)) prior[prop] = rawProp(before, a.params.id, prop);
    return { type: "source/setProps", params: { id: a.params.id, props: prior } };
  },
  fold: () => [],
});

define({
  type: "mask/setPath",
  validate: (a, state) => validateTarget(state, a.params.id, ["path"]),
  apply: (a, log) => setProps(log, a.params.id, { path: a.params.path, shape: undefined }),
  invert: (a, before) => ({
    type: "source/setProps",
    params: {
      id: a.params.id,
      props: { path: rawProp(before, a.params.id, "path"), shape: rawProp(before, a.params.id, "shape") },
    },
  }),
  fold: () => [],
});

define({
  type: "mask/remove",
  validate: (a, state) =>
    rawNode(state, a.params.id)?.kind === "mask"
      ? validateTarget(state, a.params.id, [])
      : invalid({ code: "ELEMENT_NOT_FOUND", message: `mask "${a.params.id}" does not exist` }),
  apply: (a, log) => log.append({ op: "remove", id: a.params.id }),
  invert: (a, before) => {
    const node = rawNode(before, a.params.id)!;
    return {
      type: "mask/restore",
      params: {
        id: a.params.id,
        parentId: node.parent as string,
        node: nodeSpecOf(node),
        after: siblingAfter(before, a.params.id),
      },
    };
  },
  fold: () => [],
});

define({
  type: "mask/restore",
  validate: (a, state) =>
    state.tree.byId.has(a.params.id)
      ? invalid({ code: "DUPLICATE_ID", message: `"${a.params.id}" exists` })
      : validateTarget(state, a.params.parentId, []),
  apply: (a, log) =>
    log.append({
      op: "insert",
      id: a.params.id,
      parent: a.params.parentId,
      after: a.params.after,
      node: nodeOfSpec({ ...a.params.node, kind: "mask" }, a.params.parentId),
    }),
  invert: (a) => ({ type: "mask/remove", params: { id: a.params.id } }),
  fold: () => [],
});
