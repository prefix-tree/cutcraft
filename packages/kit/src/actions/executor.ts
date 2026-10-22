import type { AssetManifest } from "../manifest/types";
import { createPatchLog } from "../patches/log";
import type { PatchLog } from "../patches/types";
import { resolve, type ResolvedState } from "../resolve/resolve";
import type { CollectedTree } from "../resolve/tree";
import { ActionHistory, type HistoryEntry } from "./history";
import { getHandler, inverseOf, type ApplyContext } from "./registry";
import type { Action, ActionError, ActionInput, ActionType } from "./types";

export interface ActionResult {
  readonly ok: boolean;
  readonly action?: Action;
  readonly inverse?: ActionInput;
  readonly errors?: readonly ActionError[];
}

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
 * Undo and redo re-run inverses and originals through the same path, so
 * the patch log is an append-only record until a fold replaces the tree.
 */
export class Executor {
  private tree: CollectedTree;
  private readonly manifest: AssetManifest;
  private readonly patchLog: PatchLog;
  private readonly hist: ActionHistory;
  private readonly now: () => number;
  private readonly newActionId: () => string;
  private counter = 0;

  constructor(options: ExecutorOptions) {
    this.tree = options.tree;
    this.manifest = options.manifest;
    this.patchLog = options.log ?? createPatchLog({ isSource: (id) => this.tree.byId.has(id) });
    this.hist = options.history ?? new ActionHistory();
    this.now = options.now ?? (() => Date.now());
    this.newActionId = options.newActionId ?? (() => `a${++this.counter}`);
  }

  state(): ResolvedState {
    return resolve(this.tree, this.manifest, this.patchLog);
  }

  log(): PatchLog { return this.patchLog; }
  history(): ActionHistory { return this.hist; }

  execute<T extends ActionType>(input: ActionInput<T>): ActionResult {
    const action: Action<T> = { type: input.type, params: input.params, actionId: this.newActionId(), ts: this.now() };
    return this.run(action, true);
  }

  undo(): ActionResult | null {
    const entries = this.hist.undoGroup();
    if (entries.length === 0) return null;
    let last: ActionResult = { ok: true };
    for (const entry of entries) {
      last = this.run({ ...entry.inverse, actionId: `undo-${entry.action.actionId}`, ts: this.now() } as Action, false);
      if (!last.ok) break;
    }
    return last;
  }

  redo(): ActionResult | null {
    const entries = this.hist.redoGroup();
    if (entries.length === 0) return null;
    let last: ActionResult = { ok: true };
    for (const entry of entries) {
      last = this.run({ ...entry.action, actionId: `redo-${entry.action.actionId}`, ts: this.now() }, false);
      if (!last.ok) break;
    }
    return last;
  }

  beginGroup(description?: string): string { return this.hist.beginGroup(description); }
  endGroup(): void { this.hist.endGroup(); }

  /** After a fold or a model write: new tree, empty log, history cleared. */
  replaceTree(tree: CollectedTree): void {
    this.tree = tree;
    this.patchLog.clear();
    this.hist.clear();
  }

  private run(action: Action, record: boolean): ActionResult {
    const handler = getHandler(action.type);
    if (!handler) return { ok: false, errors: [{ code: "UNKNOWN_ACTION", message: `no handler for ${action.type}` }] };
    const before = this.state();
    const validation = handler.validate(action, before);
    if (!validation.valid) return { ok: false, action, errors: validation.errors };
    const inverse = inverseOf(action, before);
    const from = this.patchLog.mark();
    const ctx: ApplyContext = { before, manifest: this.manifest, current: () => this.state() };
    try {
      handler.apply(action, this.patchLog, ctx);
    } catch (error) {
      this.patchLog.truncate(from);
      return { ok: false, action, errors: [{ code: "INVALID_PARAMS", message: error instanceof Error ? error.message : String(error) }] };
    }
    const to = this.patchLog.mark();
    if (record) this.hist.push(action, inverse, [from, to]);
    return { ok: true, action, inverse };
  }

  entries(): readonly HistoryEntry[] { return this.hist.entries(); }
}
