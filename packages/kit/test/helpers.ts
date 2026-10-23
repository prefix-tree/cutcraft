import { readFileSync } from "node:fs";
import { join } from "node:path";
import { Executor, collectModule, resolve, type AssetManifest, type CollectedTree, type ResolvedState } from "@cutcut/kit";
import { buildSourceIndex } from "@cutcut/kit/source";
import * as sample from "../fixtures/sample";

export const fixturesDir = join(import.meta.dirname, "..", "fixtures");
export const fixtureText = readFileSync(join(fixturesDir, "sample.tsx"), "utf8");
export const manifest = JSON.parse(readFileSync(join(fixturesDir, "sample.manifest.json"), "utf8")) as AssetManifest;

export function fixtureTree(withIndex = true): CollectedTree {
  return collectModule(sample, {}, withIndex ? { index: buildSourceIndex(fixtureText) } : {});
}

export function fixtureExecutor(): Executor {
  return new Executor({ tree: fixtureTree(), manifest, now: () => 0 });
}

export interface SerializedItem {
  id: string; kind: string; track: string | null; parent: string | null; order: number;
  start: number; end: number; editable: string; props: string; interior?: string; text: string | undefined; errors: string[];
}

/** A stable view of a resolved state for equality checks: ids sorted, numbers rounded to the millisecond. */
export function serialize(state: ResolvedState, withProps = true): SerializedItem[] {
  const orderOf = (id: string, parent: string | null): number => {
    const siblings = parent ? state.tree.byId.get(parent)?.children ?? [] : [];
    return siblings.findIndex((c) => c.id === id);
  };
  return [...state.items.values()]
    .sort((a, b) => (a.id < b.id ? -1 : 1))
    .map((p) => ({
      id: p.id, kind: p.kind, track: p.track, parent: p.parent, order: orderOf(p.id, p.parent),
      start: round(p.start), end: round(p.end), editable: p.editable,
      props: withProps ? stable(state.tree.byId.get(p.id)?.props ?? p.props) : "",
      ...(withProps ? { interior: p.interior ? stable(p.interior.props) : "" } : {}),
      text: state.tree.byId.get(p.id)?.text,
      errors: p.errors.map((e) => e.code),
    }));
}

export function round(n: number): number {
  return Math.round(n * 1000) / 1000;
}

export function stable(value: unknown): string {
  return JSON.stringify(value, (_k, v: unknown) =>
    v && typeof v === "object" && !Array.isArray(v)
      ? Object.fromEntries(Object.entries(v as Record<string, unknown>).filter(([, x]) => x !== undefined).sort(([a], [b]) => (a < b ? -1 : 1)))
      : typeof v === "function" ? `[fn ${(v as { name: string }).name}]` : v,
  );
}

export { resolve };
