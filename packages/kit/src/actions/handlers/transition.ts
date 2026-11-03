import { TRANSITION_TYPES } from "../../jsx/enums";
import { defaultTransitionParams, TRANSITION_PARAMS } from "../../jsx/schemas/transition";
import type { Json } from "../../patches/types";
import type { ResolvedState } from "../../resolve/resolve";
import {
  define,
  insertNode,
  isError,
  rawNode,
  rawProp,
  requireElement,
  requireUnlocked,
  setProps,
  siblingAfter,
} from "../handler-kit";
import { type ActionError, invalid, nodeSpecOf, ok } from "../types";

function requireTransition(state: ResolvedState, id: string): ActionError | null {
  const node = rawNode(state, id);
  return node?.kind === "transition"
    ? null
    : { code: "ELEMENT_NOT_FOUND", message: `transition "${id}" does not exist`, path: "transitionId" };
}

function validateParams(type: string, params: Readonly<Record<string, Json>> | undefined): ActionError | null {
  if (!(TRANSITION_TYPES as readonly string[]).includes(type))
    return { code: "INVALID_PARAMS", message: `unknown transition "${type}"`, path: "type" };
  const result = TRANSITION_PARAMS[type as keyof typeof TRANSITION_PARAMS].safeParse(params ?? {});
  return result.success ? null : { code: "INVALID_PARAMS", message: result.error.message, path: "params" };
}

/** Between two adjacent siblings in a sequence track, or on one edge of a clip anywhere. */
define({
  type: "transition/add",
  validate: (a, state) => {
    if (state.tree.byId.has(a.params.transitionId))
      return invalid({ code: "DUPLICATE_ID", message: `"${a.params.transitionId}" exists` });
    const bad = validateParams(a.params.type, a.params.params);
    if (bad) return invalid(bad);
    if (!(a.params.duration > 0))
      return invalid({ code: "INVALID_PARAMS", message: "duration must be positive", path: "duration" });
    if (Array.isArray(a.params.between)) {
      const [aId, bId] = a.params.between;
      const left = requireElement(state, aId, "between[0]");
      const right = requireElement(state, bId, "between[1]");
      if (isError(left)) return invalid(left);
      if (isError(right)) return invalid(right);
      const locked = requireUnlocked(state, left);
      if (locked) return invalid(locked);
      if (left.track !== right.track)
        return invalid({ code: "NOT_ADJACENT", message: "clips are on different tracks" });
      if (left.kind === "gap" || right.kind === "gap" || left.kind === "transition" || right.kind === "transition")
        return invalid({ code: "NOT_ADJACENT", message: "a transition needs a clip on each side" });
      if (siblingAfter(state, bId) !== aId)
        return invalid({ code: "NOT_ADJACENT", message: "clips must be adjacent siblings" });
      if (state.tracks.find((t) => t.id === left.track)?.layout !== "sequence")
        return invalid({
          code: "UNSUPPORTED_ON_LAYOUT",
          message: "between-transitions need a sequence track; use on/edge",
        });
      if (a.params.duration > left.duration || a.params.duration > right.duration)
        return invalid({ code: "INSUFFICIENT_HANDLES", message: "transition is longer than one of its clips" });
      return ok;
    }
    const edgeForm = a.params.between as { on: string; edge: "in" | "out" };
    const target = requireElement(state, edgeForm.on, "between.on");
    if (isError(target)) return invalid(target);
    const locked = requireUnlocked(state, target);
    if (locked) return invalid(locked);
    return a.params.duration <= target.duration
      ? ok
      : invalid({ code: "INSUFFICIENT_HANDLES", message: "transition is longer than the clip" });
  },
  apply: (a, log, ctx) => {
    const params = { ...defaultTransitionParams(a.params.type), ...(a.params.params ?? {}) } as Record<string, Json>;
    const props: Record<string, Json> = {
      id: a.params.transitionId,
      type: a.params.type,
      duration: a.params.duration,
      params,
    };
    if (Array.isArray(a.params.between)) {
      const left = rawNode(ctx.before, a.params.between[0])!;
      insertNode(log, left.parent as string, left.id, { id: a.params.transitionId, kind: "transition", props });
    } else {
      const edgeForm = a.params.between as { on: string; edge: "in" | "out" };
      const target = rawNode(ctx.before, edgeForm.on)!;
      props.on = edgeForm.on;
      props.edge = edgeForm.edge;
      insertNode(log, target.parent as string, target.id, { id: a.params.transitionId, kind: "transition", props });
    }
  },
  invert: (a) => ({ type: "transition/remove", params: { transitionId: a.params.transitionId } }),
  fold: () => [],
});

define({
  type: "transition/remove",
  validate: (a, state) => {
    const e = requireTransition(state, a.params.transitionId);
    return e ? invalid(e) : ok;
  },
  apply: (a, log) => log.append({ op: "remove", id: a.params.transitionId }),
  invert: (a, before) => {
    const node = rawNode(before, a.params.transitionId)!;
    return {
      type: "transition/restore",
      params: {
        transitionId: a.params.transitionId,
        node: nodeSpecOf(node),
        trackId: node.parent as string,
        after: siblingAfter(before, a.params.transitionId),
      },
    };
  },
  fold: () => [],
});

define({
  type: "transition/restore",
  validate: (a, state) =>
    state.tree.byId.has(a.params.transitionId)
      ? invalid({ code: "DUPLICATE_ID", message: `"${a.params.transitionId}" exists` })
      : ok,
  apply: (a, log) => insertNode(log, a.params.trackId, a.params.after, a.params.node),
  invert: (a) => ({ type: "transition/remove", params: { transitionId: a.params.transitionId } }),
  fold: () => [],
});

define({
  type: "transition/update",
  validate: (a, state) => {
    const e = requireTransition(state, a.params.transitionId);
    if (e) return invalid(e);
    const type = a.params.type ?? String(rawProp(state, a.params.transitionId, "type") ?? "crossfade");
    const params =
      a.params.type && a.params.params === undefined
        ? undefined
        : {
            ...((rawProp(state, a.params.transitionId, "params") ?? {}) as Record<string, Json>),
            ...(a.params.params ?? {}),
          };
    const bad = validateParams(type, params);
    if (bad) return invalid(bad);
    if (a.params.duration !== undefined && !(a.params.duration > 0))
      return invalid({ code: "INVALID_PARAMS", message: "duration must be positive", path: "duration" });
    return ok;
  },
  apply: (a, log, ctx) => {
    const props: Record<string, Json | undefined> = {};
    if (a.params.type !== undefined) {
      props.type = a.params.type;
      props.params = { ...defaultTransitionParams(a.params.type), ...(a.params.params ?? {}) } as Json;
    } else if (a.params.params !== undefined) {
      props.params = {
        ...((rawProp(ctx.before, a.params.transitionId, "params") ?? {}) as Record<string, Json>),
        ...a.params.params,
      };
    }
    if (a.params.duration !== undefined) props.duration = a.params.duration;
    setProps(log, a.params.transitionId, props);
  },
  invert: (a, before) => ({
    type: "source/setProps",
    params: {
      id: a.params.transitionId,
      props: {
        type: rawProp(before, a.params.transitionId, "type"),
        params: rawProp(before, a.params.transitionId, "params"),
        duration: rawProp(before, a.params.transitionId, "duration"),
      },
    },
  }),
  fold: () => [],
});
