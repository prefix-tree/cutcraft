// What an edit carries along. Removing, splitting or trimming a clip changes what other elements are placed from:
// titles anchored to it, transitions beside it, lengths that follow it. Left alone, those point at nothing or at a word
// the clip no longer plays. A carried action repairs them with ordinary actions of its own, run before or after the
// edit, so the patches, the write-back and the undo of the repairs are those of the actions they are.
import { createPatchLog } from "../patches/log";
import type { Json } from "../patches/types";
import { type Dependent, dependentsOf } from "../resolve/dependents";
import { type Placement, type ResolvedState, resolve } from "../resolve/resolve";
import { type ActionHandler, type ApplyContext, getHandler, inverseOf } from "./registry";
import type { Action, ActionInput, ActionType } from "./types";

/** The repairs of one edit: actions to run before it, and actions worked out from the timeline after it. */
export interface Carry {
  readonly pre?: readonly ActionInput[];
  readonly post?: (after: ResolvedState) => readonly ActionInput[];
}

/**
 * `handler`, carrying what depends on its target: `plan` names the repairs for an action on the state before it, or
 * nothing when there are none, and then the action behaves exactly as `handler` does.
 */
export function carry<T extends ActionType>(
  handler: ActionHandler<T>,
  plan: (action: Action<T>, before: ResolvedState) => Carry | null,
): ActionHandler<T> {
  return {
    ...handler,
    apply: (action, log, ctx) => {
      const repairs = plan(action, ctx.before);
      if (!repairs) return handler.apply(action, log, ctx);
      for (const sub of repairs.pre ?? []) runSub(sub, log, ctx);
      handler.apply(action, log, { ...ctx, before: ctx.current() });
      for (const sub of repairs.post?.(ctx.current()) ?? []) runSub(sub, log, ctx);
    },
    invert: (action, before) => {
      const repairs = plan(action, before);
      if (!repairs) return handler.invert(action, before);
      // The inverses are taken on a scratch run of the same steps, each against the state the step before left.
      const log = createPatchLog({
        isSource: (id) => before.tree.byId.has(id),
        sourceParent: (id) => before.tree.byId.get(id)?.parent ?? null,
      });
      const current = () => resolve(before.tree, before.manifest, log);
      const ctx: ApplyContext = { before, manifest: before.manifest, current };
      const inverses: ActionInput[] = [];
      const step = (sub: ActionInput) => {
        const state = current();
        inverses.push(inverseOf({ ...sub, actionId: "carry", ts: 0 } as Action, state));
        runSub(sub, log, ctx);
      };
      for (const sub of repairs.pre ?? []) step(sub);
      const mid = current();
      const own = handler.invert(action, mid);
      inverses.push(...(Array.isArray(own) ? own : [own as ActionInput]));
      handler.apply(action, log, { ...ctx, before: mid });
      for (const sub of repairs.post?.(current()) ?? []) step(sub);
      return inverses.reverse();
    },
  };
}

function runSub(sub: ActionInput, log: Parameters<ActionHandler["apply"]>[1], ctx: ApplyContext): void {
  const handler = getHandler(sub.type);
  if (!handler) throw new Error(`no handler for ${sub.type}`);
  const state = ctx.current();
  const action = { ...sub, actionId: "carry", ts: 0 } as Action;
  const result = handler.validate(action, state);
  if (!result.valid) throw new Error(`cannot carry ${sub.type}: ${result.errors.map((e) => e.message).join("; ")}`);
  handler.apply(action, log, { ...ctx, before: state });
}

const round3 = (x: number): number => Math.round(x * 1000) / 1000;
const setProps = (id: string, props: Record<string, Json | undefined>): ActionInput => ({
  type: "source/setProps",
  params: { id, props },
});

/** The clip before `id` on its track, skipping transitions and gaps. */
function clipBefore(state: ResolvedState, id: string): Placement | undefined {
  const track = state.tracks.find((t) => t.items.includes(id));
  const siblings = track ? (state.tree.byId.get(track.id)?.children ?? []) : [];
  for (let i = siblings.findIndex((c) => c.id === id) - 1; i >= 0; i--) {
    const kind = siblings[i]?.kind;
    if (kind !== "transition" && kind !== "gap") return state.items.get(siblings[i]!.id);
  }
  return undefined;
}

/**
 * Removing a clip: what starts from it moves to the clip before it on its track, keeping its time on the timeline
 * where that clip is still playing, and otherwise held inside it; with no clip before, it is removed too. A transition
 * left with nothing on one side is removed; one that still has a clip on each side stays. A length that follows the
 * clip becomes the seconds it was.
 */
export function carryRemoval(id: string, before: ResolvedState): Carry | null {
  const deps = dependentsOf(before, id);
  if (deps.length === 0) return null;
  const pre: ActionInput[] = [];
  const prev = clipBefore(before, id);
  const removed = new Set<string>();
  const anchored = deps.filter((d): d is Extract<Dependent, { kind: "anchor" }> => d.kind === "anchor");
  if (!prev) for (const d of anchored) removed.add(d.id);
  for (const d of deps) {
    if (d.kind !== "match" && d.kind !== "until") continue;
    const p = before.items.get(d.id);
    if (p && !removed.has(d.id)) pre.push(setProps(d.id, { duration: round3(p.duration) }));
  }
  for (const d of anchored) {
    const p = before.items.get(d.id);
    if (!p) continue;
    if (!prev) {
      pre.push({ type: "element/remove", params: { id: d.id } });
      continue;
    }
    const room = Math.max(0, prev.duration - p.duration);
    const offset = round3(Math.min(room, Math.max(0, p.start - prev.start)));
    pre.push(setProps(d.id, { anchor: prev.id, at: undefined, offset }));
  }
  // With a clip on each side once this one is gone, one transition still joins them: the one before it, if any.
  const beside = deps.filter((d): d is Extract<Dependent, { kind: "beside" }> => d.kind === "beside");
  const joins = prev !== undefined && hasClipAfter(before, id);
  const kept = joins ? (beside.find((d) => d.side === "before") ?? beside[0]) : undefined;
  for (const d of deps) {
    if (d.kind === "on" || (d.kind === "beside" && d !== kept))
      pre.push({ type: "transition/remove", params: { transitionId: d.id } });
  }
  return pre.length > 0 ? { pre } : null;
}

/** The clip a transition leads into on its track, else the one it leaves; transitions and gaps are skipped. */
function clipBeside(state: ResolvedState, id: string): Placement | undefined {
  const track = state.tracks.find((t) => t.items.includes(id));
  const siblings = track ? (state.tree.byId.get(track.id)?.children ?? []) : [];
  const at = siblings.findIndex((c) => c.id === id);
  const isClip = (kind: string | undefined) => kind !== undefined && kind !== "transition" && kind !== "gap";
  const next = siblings.slice(at + 1).find((c) => c.kind !== "transition");
  if (next && isClip(next.kind)) return state.items.get(next.id);
  return clipBefore(state, id);
}

/**
 * Removing a transition: what starts from it (a whoosh on the cut) moves to the clip the transition led into, or with
 * none the clip it left, keeping its distance from that clip's start; with no clip beside it, it is removed too. A
 * length that follows the transition becomes the seconds it was. Removing a clip removes the transitions it leaves
 * with one side, and so carries what hangs off them as well.
 */
export function carryTransitionRemoval(id: string, before: ResolvedState): Carry | null {
  const deps = dependentsOf(before, id).filter((d) => d.kind === "anchor" || d.kind === "match" || d.kind === "until");
  if (deps.length === 0) return null;
  const pre: ActionInput[] = [];
  const target = clipBeside(before, id);
  for (const d of deps) {
    const p = before.items.get(d.id);
    if (!p) continue;
    if (d.kind === "match" || d.kind === "until") pre.push(setProps(d.id, { duration: round3(p.duration) }));
    else if (!target) pre.push({ type: "element/remove", params: { id: d.id } });
    else pre.push(setProps(d.id, { anchor: target.id, at: undefined, offset: round3(p.start - target.start) }));
  }
  return pre.length > 0 ? { pre } : null;
}

/** Whether what follows `id` on its track, past any transitions, is a clip a transition can join (not a gap). */
function hasClipAfter(state: ResolvedState, id: string): boolean {
  const track = state.tracks.find((t) => t.items.includes(id));
  const siblings = track ? (state.tree.byId.get(track.id)?.children ?? []) : [];
  const next = siblings.slice(siblings.findIndex((c) => c.id === id) + 1).find((c) => c.kind !== "transition");
  return next !== undefined && next.kind !== "gap";
}

/**
 * Splitting a clip: what belongs to its second half moves to `newId`. A title at a word that now plays in the second
 * half is anchored to it with the same word, an anchor on the clip's end and a length until the clip ends follow the
 * end, and so does a transition on the clip's out edge.
 */
export function carrySplit(id: string, newId: string, before: ResolvedState): Carry | null {
  const deps = dependentsOf(before, id).filter((d) => d.kind !== "beside" && d.kind !== "match");
  if (deps.length === 0) return null;
  return {
    post: (after) => {
      const post: ActionInput[] = [];
      for (const d of deps) {
        if (d.kind === "anchor" && d.edge === "end") post.push(setProps(d.id, { anchor: `${newId}.end` }));
        else if (d.kind === "anchor" && d.at !== undefined && lostWord(after, d.id))
          post.push(setProps(d.id, { anchor: newId }));
        else if (d.kind === "until") post.push(setProps(d.id, { duration: { until: newId } }));
        else if (d.kind === "on" && d.edge === "out") post.push(setProps(d.id, { on: newId }));
      }
      return post;
    },
  };
}

/** Trimming a clip: a title at a word trimmed away keeps the time it had, held inside the clip, as an offset. */
export function carryTrim(id: string, before: ResolvedState): Carry | null {
  const deps = dependentsOf(before, id).filter(
    (d): d is Extract<Dependent, { kind: "anchor" }> => d.kind === "anchor" && d.at !== undefined,
  );
  if (deps.length === 0) return null;
  return {
    post: (after) => {
      const clip = after.items.get(id);
      if (!clip) return [];
      return deps
        .filter((d) => lostWord(after, d.id))
        .map((d) => {
          const was = before.items.get(d.id)?.start ?? clip.start;
          return setProps(d.id, {
            at: undefined,
            offset: round3(Math.min(clip.duration, Math.max(0, was - clip.start))),
          });
        });
    },
  };
}

/** Whether `id`'s `at` names a word its anchor no longer plays. */
function lostWord(state: ResolvedState, id: string): boolean {
  return state.items.get(id)?.errors.some((e) => e.code === "INVALID_ANCHOR" && e.prop === "at") ?? false;
}
