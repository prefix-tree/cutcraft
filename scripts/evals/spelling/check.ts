// Loads a file in either spelling with the real resolver and lint, and reads back what the tasks ask about.
import { readFileSync } from "node:fs";
import { join } from "node:path";

import { type AssetManifest, collectModule, lint, loadModule, resolve } from "../../../packages/sdk/src/index";
import { toChildren } from "./to-children";

export type Spelling = "children" | "props";

const manifest = JSON.parse(
  readFileSync(join(import.meta.dirname, "..", "..", "..", "examples", "showcase", "uberscene.json"), "utf8"),
) as AssetManifest;

export interface KeyOut {
  readonly at: number;
  readonly value: number;
  readonly easing: string;
}
export interface EffectOut {
  readonly type: string;
  readonly params: Record<string, unknown>;
  readonly keys: Record<string, KeyOut[]>;
}
export interface Loaded {
  /** Why the file did not load, resolve or lint; empty when it is clean. */
  readonly problems: string[];
  readonly ids: string[];
  keys(element: string, property: string): KeyOut[];
  effects(element: string): EffectOut[];
}

export function load(source: string, spelling: Spelling): Loaded {
  const problems: string[] = [];
  const none: Loaded = { problems, ids: [], keys: () => [], effects: () => [] };
  let text = source;
  try {
    if (spelling === "props") text = toChildren(source);
  } catch (error) {
    problems.push(`parse: ${(error as Error).message}`);
    return none;
  }
  let state: ReturnType<typeof resolve>;
  try {
    state = resolve(collectModule(loadModule(text) as never, {}), manifest);
  } catch (error) {
    problems.push(`load: ${(error as Error).message.split("\n")[0]}`);
    return none;
  }
  for (const e of state.errors) problems.push(`resolve: ${typeof e === "string" ? e : JSON.stringify(e)}`);
  for (const d of lint(text, { manifest })) if (d.severity === "error") problems.push(`lint ${d.rule}: ${d.message}`);
  const items = [...state.items.values()];
  const keyOf = (p: (typeof items)[number]): KeyOut => ({
    at: p.props.at as number,
    value: p.props.value as number,
    easing: p.props.easing as string,
  });
  const sorted = (ks: KeyOut[]): KeyOut[] => ks.sort((a, b) => a.at - b.at);
  return {
    problems,
    ids: items.filter((p) => p.kind !== "keyframe" && p.kind !== "effect").map((p) => p.id),
    keys: (element, property) =>
      sorted(
        items.filter((p) => p.kind === "keyframe" && p.parent === element && p.props.property === property).map(keyOf),
      ),
    effects: (element) =>
      items
        .filter((p) => p.kind === "effect" && p.parent === element)
        .map((fx) => {
          const keys: Record<string, KeyOut[]> = {};
          for (const k of items.filter((p) => p.kind === "keyframe" && p.parent === fx.id)) {
            const list = keys[k.props.param as string] ?? [];
            keys[k.props.param as string] = list;
            list.push(keyOf(k));
          }
          for (const list of Object.values(keys)) sorted(list);
          return { type: fx.props.type as string, params: (fx.props.params ?? {}) as Record<string, unknown>, keys };
        }),
  };
}
