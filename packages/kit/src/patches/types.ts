import type { CollectedNode } from "../resolve/tree";

export type Json = null | boolean | number | string | Json[] | { [key: string]: Json };

/** One change recorded by an action. Patches address elements by id, never by position in the file. */
export type Patch =
  | { readonly op: "set"; readonly id: string; readonly prop: string; readonly value: Json | undefined }
  | { readonly op: "text"; readonly id: string; readonly text: string }
  | {
      readonly op: "insert";
      readonly id: string;
      readonly parent: string;
      readonly after: string | null;
      readonly node: CollectedNode;
    }
  | { readonly op: "remove"; readonly id: string }
  | { readonly op: "move"; readonly id: string; readonly parent: string; readonly after: string | null }
  | { readonly op: "bake"; readonly id: string };

export type Presence = "present" | "inserted" | "removed";

/** The reduced effect of every patch on one element. */
export interface NetPatch {
  readonly id: string;
  presence: Presence;
  readonly props: Map<string, Json | undefined>;
  text?: string;
  place?: { parent: string; after: string | null };
  node?: CollectedNode;
  bake: boolean;
}

export interface PatchLog {
  readonly entries: readonly Patch[];
  readonly net: ReadonlyMap<string, NetPatch>;
  /** Increments on every append or truncate; resolve() memoises on it. */
  readonly version: number;
  append(patch: Patch): void;
  /** Current length, for history entries to remember what they appended. */
  mark(): number;
  /** Drop every entry at or after `mark` and rebuild `net`. */
  truncate(mark: number): void;
  clear(): void;
}
