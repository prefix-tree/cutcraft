import type { AssetManifest } from "../manifest/types";
import { createPatchLog } from "../patches/log";
import type { PatchLog } from "../patches/types";
import { type ResolvedState, resolve } from "../resolve/resolve";
import type { CollectedTree } from "../resolve/tree";
import { ActionHistory, type HistoryEntry } from "./history";
import { type ApplyContext, getHandler, inverseOf } from "./registry";
import type { Action, ActionError, ActionInput, ActionType } from "./types";

export interface ActionResult {
  readonly ok: boolean;
  readonly action?: Action;
  readonly inverse?: ActionInput;
  readonly errors?: readonly ActionError[];
}

/** What `can()` answers: whether `execute()` would accept the action now, and why not. */
export interface CanResult {
  readonly ok: boolean;
  readonly errors?: readonly ActionError[];
}

/**
 * How `run` treats an action. `execute` checks it for new errors and records it; `replay` (undo, redo) records nothing
 * and is not checked; `check` (`can()`) is checked like `execute`, then everything it appended is taken back.
 */
type Mode = "execute" | "replay" | "check";

export interface ExecutorOptions {
  readonly tree: CollectedTree;
  readonly manifest: AssetManifest;
  readonly log?: PatchLog;
  readonly history?: ActionHistory;
  readonly now?: () => number;
  readonly newActionId?: () => string;
}

/**
 * Runs actions against `{ tree, patches }`: validate on the state before,
 * compute the inverse from that state, append patches, record history.
 * An action whose result has errors the state before did not have is
 * refused with `BREAKS_FILE` and leaves nothing behind.
 * Undo and redo re-run inverses and originals through the same path, so
 * the patch log is an append-only record until a fold replaces the tree.
 * They are not checked for new errors: each returns to, or repeats, a
 * state an accepted action already reached.
 * `can()` runs the same path as `execute()` and takes back what it appended,
 * so it answers exactly what `execute()` would, without changing anything.
 */
export class Executor {
  private tree: CollectedTree;
  private readonly manifest: AssetManifest;
  private readonly patchLog: PatchLog;
  private readonly hist: ActionHistory;
  private readonly now: () => number;
  private readonly newActionId: () => string;
  private counter = 0;
  /** The state before a `can()`, valid while the log is at the version the take-back left it at. */
  private kept: { readonly version: number; readonly tree: CollectedTree; readonly state: ResolvedState } | null = null;

  constructor(options: ExecutorOptions) {
    this.tree = options.tree;
    this.manifest = options.manifest;
    this.patchLog =
      options.log ??
      createPatchLog({
        isSource: (id) => this.tree.byId.has(id),
        sourceParent: (id) => this.tree.byId.get(id)?.parent ?? null,
        sourceNode: (id) => this.tree.byId.get(id),
      });
    this.hist = options.history ?? new ActionHistory();
    this.now = options.now ?? (() => Date.now());
    this.newActionId = options.newActionId ?? (() => `a${++this.counter}`);
  }

  state(): ResolvedState {
    const kept = this.kept;
    // A take-back leaves the log with the same patches at a new version: the state before `can()` is still the answer.
    if (kept && kept.version === this.patchLog.version && kept.tree === this.tree) return kept.state;
    return resolve(this.tree, this.manifest, this.patchLog);
  }

  log(): PatchLog {
    return this.patchLog;
  }
  history(): ActionHistory {
    return this.hist;
  }

  execute<T extends ActionType>(input: ActionInput<T>): ActionResult {
    const action: Action<T> = { type: input.type, params: input.params, actionId: this.newActionId(), ts: this.now() };
    return this.run(action, "execute");
  }

  /** Whether `execute(input)` would be accepted now, and the errors it would give if not. Nothing changes. */
  can<T extends ActionType>(input: ActionInput<T>): CanResult {
    const action: Action<T> = { type: input.type, params: input.params, actionId: "can", ts: this.now() };
    const result = this.run(action, "check");
    return result.ok ? { ok: true } : { ok: false, ...(result.errors ? { errors: result.errors } : {}) };
  }

  undo(): ActionResult | null {
    const entries = this.hist.undoGroup();
    if (entries.length === 0) return null;
    let last: ActionResult = { ok: true };
    for (const entry of entries) {
      last = this.run(
        { ...entry.inverse, actionId: `undo-${entry.action.actionId}`, ts: this.now() } as Action,
        "replay",
      );
      if (!last.ok) break;
    }
    return last;
  }

  redo(): ActionResult | null {
    const entries = this.hist.redoGroup();
    if (entries.length === 0) return null;
    let last: ActionResult = { ok: true };
    for (const entry of entries) {
      last = this.run({ ...entry.action, actionId: `redo-${entry.action.actionId}`, ts: this.now() }, "replay");
      if (!last.ok) break;
    }
    return last;
  }

  beginGroup(description?: string): string {
    return this.hist.beginGroup(description);
  }
  endGroup(): void {
    this.hist.endGroup();
  }

  /** After a fold or a model write: new tree, empty log, history cleared. */
  replaceTree(tree: CollectedTree): void {
    this.tree = tree;
    this.patchLog.clear();
    this.hist.clear();
  }

  private run(action: Action, mode: Mode): ActionResult {
    const handler = getHandler(action.type);
    if (!handler) return { ok: false, errors: [{ code: "UNKNOWN_ACTION", message: `no handler for ${action.type}` }] };
    const before = this.state();
    const validation = handler.validate(action, before);
    if (!validation.valid) return { ok: false, action, errors: validation.errors };
    const inverse = inverseOf(action, before);
    const from = this.patchLog.mark();
    /** Takes back what this run appended; after a `check`, the state before stays the answer. */
    const takeBack = (): void => {
      this.patchLog.truncate(from);
      if (mode === "check") this.kept = { version: this.patchLog.version, tree: this.tree, state: before };
    };
    const ctx: ApplyContext = { before, manifest: this.manifest, current: () => this.state() };
    try {
      handler.apply(action, this.patchLog, ctx);
    } catch (error) {
      takeBack();
      return {
        ok: false,
        action,
        errors: [{ code: "INVALID_PARAMS", message: error instanceof Error ? error.message : String(error) }],
      };
    }
    if (mode !== "replay") {
      // resolve() memoises on the log's version, so the state after is the one the next state() returns.
      const broken = newErrors(before, this.state());
      if (broken.length > 0) {
        takeBack();
        return {
          ok: false,
          action,
          errors: [{ code: "BREAKS_FILE", message: `${action.type} would leave the file with ${broken.join("; ")}` }],
        };
      }
    }
    if (mode === "check") {
      takeBack();
      return { ok: true, action, inverse };
    }
    const to = this.patchLog.mark();
    if (mode === "execute") this.hist.push(action, inverse, [from, to]);
    return { ok: true, action, inverse };
  }

  entries(): readonly HistoryEntry[] {
    return this.hist.entries();
  }
}

/** The errors of `after` that `before` did not have, compared by code, element and prop, as `CODE id.prop: message`. */
function newErrors(before: ResolvedState, after: ResolvedState): string[] {
  const keyOf = (e: ResolvedState["errors"][number]): string =>
    `${e.code} ${e.id ?? ""} ${"prop" in e ? (e.prop ?? "") : ""}`;
  const had = new Set(before.errors.map(keyOf));
  const seen = new Set<string>();
  const out: string[] = [];
  for (const e of after.errors) {
    const key = keyOf(e);
    if (had.has(key) || seen.has(key)) continue;
    seen.add(key);
    const prop = "prop" in e && e.prop ? `.${e.prop}` : "";
    out.push(`${e.code} on ${e.id ?? "the file"}${prop}: ${e.message}`);
  }
  return out;
}
