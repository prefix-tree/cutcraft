import { effectParamProblem } from "../../jsx/effect-params";
import { isKeyframeProperty, VIDEO_EFFECT_TYPES } from "../../jsx/enums";
import { shaderFor } from "../../jsx/shaders";
import type { Json, PatchLog } from "../../patches/types";
import type { ResolvedState } from "../../resolve/resolve";
import { define, makePropHandler, rawNode, rawProp, setProps, siblingAfter, validateTarget } from "../handler-kit";
import { type ActionError, type ActionType, invalid, type NodeSpec, nodeOfSpec, nodeSpecOf, ok } from "../types";

function childrenOfKind(state: ResolvedState, parentId: string, kind: string) {
  return (rawNode(state, parentId)?.children ?? []).filter((c) => c.kind === kind);
}

function requireChild(state: ResolvedState, parentId: string, childId: string, kind: string): ActionError | null {
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
function stackPosition(state: ResolvedState, parentId: string, kind: string): string | null {
  const first = childrenOfKind(state, parentId, kind)[0];
  return first ? siblingAfter(state, first.id) : lastNonStack(state, parentId, kind);
}

function replaceAll(
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

/** effect/*: an ordered stack of children with type/params/enabled. */
function stackHandlers(ns: "effect", kind: string, types: readonly string[]) {
  const t = <N extends string>(n: N) => `${ns}/${n}` as ActionType;
  define({
    type: t("add") as "effect/add",
    validate: (a, state) => {
      const base = validateTarget(state, a.params.id, []);
      if (!base.valid) return base;
      if (state.tree.byId.has(a.params.childId))
        return invalid({ code: "DUPLICATE_ID", message: `"${a.params.childId}" exists` });
      return types.includes(a.params.type) || shaderFor(state.shaders, "effect", a.params.type)
        ? ok
        : invalid({ code: "INVALID_PARAMS", message: `unknown ${kind} type "${a.params.type}"`, path: "type" });
    },
    apply: (a, log, ctx) => {
      const stack = childrenOfKind(ctx.before, a.params.id, kind);
      const index = a.params.index ?? stack.length;
      const after =
        index <= 0
          ? lastNonStack(ctx.before, a.params.id, kind)
          : (stack[Math.min(index, stack.length) - 1]?.id ?? null);
      const props: Record<string, Json> = {
        id: a.params.childId,
        type: a.params.type,
        params: (a.params.params ?? {}) as Json,
        enabled: true,
      };
      log.append({
        op: "insert",
        id: a.params.childId,
        parent: a.params.id,
        after,
        node: nodeOfSpec({ id: a.params.childId, kind, props }, a.params.id),
      });
    },
    invert: (a) => ({ type: t("remove") as "effect/remove", params: { id: a.params.id, childId: a.params.childId } }),
    fold: () => [],
  });
  define({
    type: t("remove") as "effect/remove",
    validate: (a, state) => {
      const base = validateTarget(state, a.params.id, []);
      if (!base.valid) return base;
      const e = requireChild(state, a.params.id, a.params.childId, kind);
      return e ? invalid(e) : ok;
    },
    apply: (a, log) => log.append({ op: "remove", id: a.params.childId }),
    invert: (a, before) => ({
      type: t("restore") as "effect/restore",
      params: {
        id: a.params.id,
        node: nodeSpecOf(rawNode(before, a.params.childId)!),
        after: siblingAfter(before, a.params.childId),
      },
    }),
    fold: () => [],
  });
  define({
    type: t("restore") as "effect/restore",
    validate: (a, state) =>
      state.tree.byId.has(a.params.node.id)
        ? invalid({ code: "DUPLICATE_ID", message: `"${a.params.node.id}" exists` })
        : validateTarget(state, a.params.id, []),
    apply: (a, log) =>
      log.append({
        op: "insert",
        id: a.params.node.id,
        parent: a.params.id,
        after: a.params.after,
        node: nodeOfSpec({ ...a.params.node, kind }, a.params.id),
      }),
    invert: (a) => ({ type: t("remove") as "effect/remove", params: { id: a.params.id, childId: a.params.node.id } }),
    fold: () => [],
  });
  define({
    type: t("update") as "effect/update",
    validate: (a, state) => {
      const e = requireChild(state, a.params.id, a.params.childId, kind);
      return e ? invalid(e) : validateTarget(state, a.params.childId, ["params"]);
    },
    apply: (a, log, ctx) =>
      setProps(log, a.params.childId, {
        params: {
          ...((rawProp(ctx.before, a.params.childId, "params") ?? {}) as Record<string, Json>),
          ...a.params.params,
        },
      }),
    invert: (a, before) => ({
      type: "source/setProps",
      params: { id: a.params.childId, props: { params: rawProp(before, a.params.childId, "params") } },
    }),
    fold: () => [],
  });
  define({
    type: t("toggle") as "effect/toggle",
    validate: (a, state) => {
      const e = requireChild(state, a.params.id, a.params.childId, kind);
      return e ? invalid(e) : validateTarget(state, a.params.childId, ["enabled"]);
    },
    apply: (a, log) => setProps(log, a.params.childId, { enabled: a.params.enabled }),
    invert: (a, before) => ({
      type: "source/setProps",
      params: { id: a.params.childId, props: { enabled: rawProp(before, a.params.childId, "enabled") } },
    }),
    fold: () => [],
  });
  define({
    type: t("setOrder") as "effect/setOrder",
    validate: (a, state) => {
      const base = validateTarget(state, a.params.id, []);
      if (!base.valid) return base;
      const ids = childrenOfKind(state, a.params.id, kind)
        .map((c) => c.id)
        .sort();
      const given = [...a.params.childIds].sort();
      return ids.length === given.length && ids.every((id, i) => id === given[i])
        ? ok
        : invalid({ code: "INVALID_PARAMS", message: "childIds must be a permutation of the stack" });
    },
    apply: (a, log, ctx) => {
      let after = stackPosition(ctx.before, a.params.id, kind);
      for (const id of a.params.childIds) {
        log.append({ op: "move", id, parent: a.params.id, after });
        after = id;
      }
    },
    invert: (a, before) => ({
      type: t("setOrder") as "effect/setOrder",
      params: { id: a.params.id, childIds: childrenOfKind(before, a.params.id, kind).map((c) => c.id) },
    }),
    fold: () => [],
  });
  define({
    type: t("setStack") as "effect/setStack",
    validate: (a, state) => validateTarget(state, a.params.id, []),
    apply: (a, log, ctx) => replaceAll(log, ctx.before, a.params.id, kind, a.params.nodes, a.params.after),
    invert: (a, before) => ({
      type: t("setStack") as "effect/setStack",
      params: {
        id: a.params.id,
        nodes: childrenOfKind(before, a.params.id, kind).map(nodeSpecOf),
        after: stackPosition(before, a.params.id, kind),
      },
    }),
    fold: () => [],
  });
}

function lastNonStack(state: ResolvedState, parentId: string, kind: string): string | null {
  // Stacks are kept after the non-stack children so prop edits never reorder siblings of other kinds.
  const node = rawNode(state, parentId);
  const others = (node?.children ?? []).filter((c) => c.kind !== kind);
  const last = others[others.length - 1];
  return last ? last.id : null;
}

stackHandlers("effect", "effect", VIDEO_EFFECT_TYPES);

/** One `<ColorGrade>` child per clip, created or replaced as a whole. */
define({
  type: "colorGrade/set",
  validate: (a, state) => validateTarget(state, a.params.id, []),
  apply: (a, log, ctx) => {
    const existing = childrenOfKind(ctx.before, a.params.id, "colorGrade");
    for (const c of existing) log.append({ op: "remove", id: c.id });
    if (a.params.grading) {
      const id = `${a.params.id}_grade`;
      log.append({
        op: "insert",
        id,
        parent: a.params.id,
        after: lastNonStack(ctx.before, a.params.id, "colorGrade"),
        node: nodeOfSpec({ id, kind: "colorGrade", props: { id, ...a.params.grading } }, a.params.id),
      });
    }
  },
  invert: (a, before) => {
    const prior = childrenOfKind(before, a.params.id, "colorGrade")[0];
    const grading = prior
      ? (Object.fromEntries(Object.entries(prior.props).filter(([k]) => k !== "id")) as Record<string, Json>)
      : undefined;
    return { type: "colorGrade/set", params: grading ? { id: a.params.id, grading } : { id: a.params.id } };
  },
  fold: () => [],
});

// ── keyframes ───────────────────────────────────────────────────────────────

define({
  type: "keyframe/add",
  validate: (a, state) => {
    const base = validateTarget(state, a.params.id, []);
    if (!base.valid) return base;
    if (state.tree.byId.has(a.params.keyId))
      return invalid({ code: "DUPLICATE_ID", message: `"${a.params.keyId}" exists` });
    const { property, param } = a.params;
    if ((property === undefined) === (param === undefined))
      return invalid({ code: "INVALID_PARAMS", message: "give property or param, not both", path: "property" });
    const item = state.items.get(a.params.id)!;
    if (param !== undefined) {
      if (item.kind !== "effect")
        return invalid({ code: "INVALID_PARAMS", message: "a param keyframe goes on an effect", path: "id" });
      const problem = effectParamProblem(item.props.type, state.shaders, param, a.params.value);
      if (problem) return invalid({ code: "INVALID_PARAMS", message: problem.message, path: problem.prop });
    } else if (item.kind === "effect" || !isKeyframeProperty(property as string))
      return invalid({ code: "INVALID_PARAMS", message: `unknown property "${property}"`, path: "property" });
    if (a.params.at < 0 || a.params.at > item.duration + 1e-6)
      return invalid({ code: "OUT_OF_BOUNDS", message: "keyframe time must be inside the element" });
    return ok;
  },
  apply: (a, log, ctx) => {
    const props: Record<string, Json> = {
      id: a.params.keyId,
      ...(a.params.param !== undefined ? { param: a.params.param } : { property: a.params.property as string }),
      at: a.params.at,
      value: a.params.value,
    };
    if (a.params.easing) props.easing = a.params.easing;
    log.append({
      op: "insert",
      id: a.params.keyId,
      parent: a.params.id,
      after: lastNonStack(ctx.before, a.params.id, "keyframe"),
      node: nodeOfSpec({ id: a.params.keyId, kind: "keyframe", props }, a.params.id),
    });
  },
  invert: (a) => ({ type: "keyframe/remove", params: { id: a.params.id, keyId: a.params.keyId } }),
  fold: () => [],
});

define({
  type: "keyframe/remove",
  validate: (a, state) => {
    const e = requireChild(state, a.params.id, a.params.keyId, "keyframe");
    return e ? invalid(e) : validateTarget(state, a.params.id, []);
  },
  apply: (a, log) => log.append({ op: "remove", id: a.params.keyId }),
  invert: (a, before) => ({
    type: "keyframe/restore",
    params: {
      id: a.params.id,
      node: nodeSpecOf(rawNode(before, a.params.keyId)!),
      after: siblingAfter(before, a.params.keyId),
    },
  }),
  fold: () => [],
});

define({
  type: "keyframe/restore",
  validate: (a, state) =>
    state.tree.byId.has(a.params.node.id)
      ? invalid({ code: "DUPLICATE_ID", message: `"${a.params.node.id}" exists` })
      : validateTarget(state, a.params.id, []),
  apply: (a, log) =>
    log.append({
      op: "insert",
      id: a.params.node.id,
      parent: a.params.id,
      after: a.params.after,
      node: nodeOfSpec({ ...a.params.node, kind: "keyframe" }, a.params.id),
    }),
  invert: (a) => ({ type: "keyframe/remove", params: { id: a.params.id, keyId: a.params.node.id } }),
  fold: () => [],
});

define(makePropHandler({
  type: "keyframe/update",
  target: (p) => p.keyId,
  kinds: ["keyframe"],
  write: (p) => ({
    ...("value" in p ? { value: p.value } : {}),
    ...(p.easing !== undefined ? { easing: p.easing } : {}),
  }),
}));

define(makePropHandler({
  type: "keyframe/move",
  target: (p) => p.keyId,
  kinds: ["keyframe"],
  write: (p) => ({ at: p.at }),
  validate: (a, state) => {
    const parent = state.items.get(a.params.id);
    return parent && a.params.at >= 0 && a.params.at <= parent.duration + 1e-6
      ? ok
      : invalid({ code: "OUT_OF_BOUNDS", message: "keyframe time must be inside the element" });
  },
}));

define({
  type: "keyframe/setAll",
  validate: (a, state) => validateTarget(state, a.params.id, []),
  apply: (a, log, ctx) => replaceAll(log, ctx.before, a.params.id, "keyframe", a.params.nodes, a.params.after),
  invert: (a, before) => ({
    type: "keyframe/setAll",
    params: {
      id: a.params.id,
      nodes: childrenOfKind(before, a.params.id, "keyframe").map(nodeSpecOf),
      after: stackPosition(before, a.params.id, "keyframe"),
    },
  }),
  fold: () => [],
});

export { childrenOfKind, lastNonStack, replaceAll, requireChild, stackPosition };
