import { AUTO_GROUP_TYPES, describeAction, targetIdOf, type Action, type ActionInput } from "./types";

export interface HistoryEntry {
  readonly action: Action;
  readonly inverse: ActionInput;
  readonly ts: number;
  readonly description: string;
  readonly groupId?: string;
  /** Range of patch-log entries this action appended. */
  readonly patchMark: readonly [number, number];
}

export interface HistorySnapshot {
  readonly id: string;
  readonly name: string;
  readonly ts: number;
  readonly stackIndex: number;
}

/**
 * Undo/redo stacks of invertible actions. Port of OpenReel's ActionHistory:
 * explicit nested groups for gestures and model turns, auto-grouping of
 * rapid same-type same-target updates, named snapshots as stack indexes.
 */
export class ActionHistory {
  private readonly undoStack: HistoryEntry[] = [];
  private readonly redoStack: HistoryEntry[] = [];
  private readonly snapshots: HistorySnapshot[] = [];
  private currentGroup: string | null = null;
  private groupDepth = 0;
  private lastTs = 0;
  private counter = 0;

  constructor(
    private readonly max = 1000,
    private readonly autoGroupWindowMs = 100,
    private readonly now: () => number = () => Date.now(),
  ) {}

  push(action: Action, inverse: ActionInput, patchMark: readonly [number, number]): HistoryEntry {
    const ts = this.now();
    const last = this.undoStack[this.undoStack.length - 1];
    let groupId = this.currentGroup;
    if (!groupId && last && ts - this.lastTs < this.autoGroupWindowMs && last.action.type === action.type && AUTO_GROUP_TYPES.has(action.type)) {
      const a = targetIdOf(last.action);
      const b = targetIdOf(action);
      if (a !== null && a === b) {
        groupId = last.groupId ?? `auto-${ts}-${this.counter++}`;
        if (!last.groupId) this.undoStack[this.undoStack.length - 1] = { ...last, groupId };
      }
    }
    this.lastTs = ts;
    const entry: HistoryEntry = { action, inverse, ts, description: describeAction(action), patchMark, ...(groupId ? { groupId } : {}) };
    this.undoStack.push(entry);
    this.redoStack.length = 0;
    if (this.undoStack.length > this.max) this.undoStack.shift();
    return entry;
  }

  beginGroup(_description?: string): string {
    if (this.groupDepth === 0) this.currentGroup = `group-${this.now()}-${this.counter++}`;
    this.groupDepth += 1;
    return this.currentGroup as string;
  }

  endGroup(): void {
    this.groupDepth = Math.max(0, this.groupDepth - 1);
    if (this.groupDepth === 0) this.currentGroup = null;
  }

  /** Pop the newest entry together with the rest of its group, newest first. */
  undoGroup(): HistoryEntry[] {
    const popped: HistoryEntry[] = [];
    const last = this.undoStack[this.undoStack.length - 1];
    if (!last) return popped;
    const group = last.groupId;
    while (this.undoStack.length > 0) {
      const top = this.undoStack[this.undoStack.length - 1] as HistoryEntry;
      if (popped.length > 0 && (group === undefined || top.groupId !== group)) break;
      this.undoStack.pop();
      popped.push(top);
      if (group === undefined) break;
    }
    this.redoStack.push(...popped);
    return popped;
  }

  /** Take back the newest undone group, oldest first (the order to re-apply). */
  redoGroup(): HistoryEntry[] {
    const taken: HistoryEntry[] = [];
    const last = this.redoStack[this.redoStack.length - 1];
    if (!last) return taken;
    const group = last.groupId;
    while (this.redoStack.length > 0) {
      const top = this.redoStack[this.redoStack.length - 1] as HistoryEntry;
      if (taken.length > 0 && (group === undefined || top.groupId !== group)) break;
      this.redoStack.pop();
      taken.push(top);
      if (group === undefined) break;
    }
    this.undoStack.push(...taken);
    return taken;
  }

  canUndo(): boolean { return this.undoStack.length > 0; }
  canRedo(): boolean { return this.redoStack.length > 0; }
  entries(): readonly HistoryEntry[] { return this.undoStack; }

  createSnapshot(name: string): HistorySnapshot {
    const snap = { id: `snap-${this.counter++}`, name, ts: this.now(), stackIndex: this.undoStack.length };
    this.snapshots.push(snap);
    return snap;
  }

  listSnapshots(): readonly HistorySnapshot[] { return this.snapshots; }

  clear(): void {
    this.undoStack.length = 0;
    this.redoStack.length = 0;
    this.snapshots.length = 0;
    this.currentGroup = null;
    this.groupDepth = 0;
  }
}
