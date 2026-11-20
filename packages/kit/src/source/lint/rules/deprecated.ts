import type * as t from "@babel/types";

import { COMPONENT_NAMES } from "../../../components/index";
import { ELEMENTS, ENGINE_LAYERS } from "../../../jsx/elements";
import type { SourceEdit } from "../../edits";
import type { Range } from "../../parse";
import { DEPRECATIONS, type Deprecation } from "../deprecations";
import { attributeRange, idOf, jsxTags, movePropsInto, propAt, renameProp, renameValue, tagName } from "../fixes";
import type { Diagnostic } from "../index";
import type { Rule } from "./index";

/** The tags a `"*"` row covers: the kit's elements and components, never the HTML of free code. */
const KIT_TAGS: ReadonlySet<string> = new Set([
  ...Object.keys(ELEMENTS),
  ...Object.keys(ENGINE_LAYERS),
  ...COMPONENT_NAMES,
]);

/**
 * A prop or a value spelled the way an earlier version took it. Where the new spelling can be written for certain the
 * diagnostic carries the fix; every fixable finding on one tag carries the same edits, which mend the whole tag.
 */
export const deprecatedProps: Rule = {
  name: "deprecated-props",
  check: (index, options) => {
    const table = [...DEPRECATIONS, ...(options.deprecations ?? [])];
    if (table.length === 0) return [];
    const out: Diagnostic[] = [];
    for (const tag of jsxTags(index)) {
      const name = tagName(tag);
      const rows = table.filter((d) => d.element === name || (d.element === "*" && KIT_TAGS.has(name)));
      if (rows.length > 0) out.push(...onTag(index.text, tag, name, rows));
    }
    return out;
  },
};

interface Finding {
  readonly row: Deprecation;
  readonly range: Range;
  readonly now: string;
}

function onTag(text: string, tag: t.JSXOpeningElement, name: string, rows: readonly Deprecation[]): Diagnostic[] {
  const found: Finding[] = [];
  for (const row of rows) {
    const site = propAt(tag, row.prop);
    if (!site) continue;
    const range: Range = [site.node.start as number, site.node.end as number];
    if ("rename" in row.to) {
      const path = row.prop.split(".");
      found.push({ row, range, now: `\`${[...path.slice(0, -1), row.to.rename].join(".")}\`` });
    } else if ("into" in row.to) {
      if (site.kind === "attribute") found.push({ row, range, now: `\`${row.to.into}.${row.to.key ?? row.prop}\`` });
    } else if (renameValue(text, tag, row.prop, row.to.value.from, row.to.value.to)) {
      found.push({ row, range, now: `"${row.to.value.to}"` });
    }
  }
  if (found.length === 0) return [];

  // Renames and respellings first: a value that also moves is respelled as it goes.
  const simple = new Map<Finding, SourceEdit[]>();
  for (const f of found) {
    const to = f.row.to;
    const edits =
      "rename" in to
        ? renameProp(tag, f.row.prop, to.rename)
        : "value" in to
          ? renameValue(text, tag, f.row.prop, to.value.from, to.value.to)
          : null;
    if (edits) simple.set(f, edits);
  }
  const rewrite = [...simple.values()].flat();

  const moved = new Map<Finding, SourceEdit[]>();
  const movedRanges: Range[] = [];
  const moves = found.filter((f) => "into" in f.row.to);
  for (const into of new Set(moves.map((f) => (f.row.to as { into: string }).into))) {
    const group = moves.filter((f) => (f.row.to as { into: string }).into === into);
    const wrap = group.map((f) => (f.row.to as { wrap?: string }).wrap).find((w) => w !== undefined);
    const edits = movePropsInto(
      text,
      tag,
      group.map((f) => ({ prop: f.row.prop, key: (f.row.to as { key?: string }).key ?? f.row.prop })),
      into,
      { rewrite, ...(wrap === undefined ? {} : { wrap }) },
    );
    if (!edits) continue;
    for (const f of group) {
      moved.set(f, edits);
      const at = attributeRange(tag, f.row.prop);
      if (at) movedRanges.push(at);
    }
    const target = attributeRange(tag, into);
    if (target && wrap !== undefined && edits.some((e) => e.range[0] > target[0] && e.range[1] === target[1]))
      movedRanges.push(target);
  }

  // One set of edits for the tag: what moved carries its own respellings, so those are not applied twice.
  const within = (e: SourceEdit) => movedRanges.some((r) => e.range[0] >= r[0] && e.range[1] <= r[1]);
  const kept = [...simple.entries()].filter(([, edits]) => !edits.some(within));
  const whole = [...new Set([...kept.flatMap(([, edits]) => edits), ...[...moved.values()].flat()])].sort(
    (a, b) => a.range[0] - b.range[0],
  );
  const fixable = (f: Finding) => moved.has(f) || simple.has(f);

  const id = idOf(tag);
  return found.map((f) => {
    const note = f.row.note ? `; ${f.row.note}` : "";
    const what = "value" in f.row.to ? `${f.row.prop}="${f.row.to.value.from}"` : f.row.prop;
    return {
      rule: "deprecated-props",
      severity: "error",
      message: `<${name}${id ? ` id="${id}"` : ""}>: \`${what}\` is ${f.now} since ${f.row.since}${note}`,
      range: f.range,
      ...(id ? { id } : {}),
      prop: f.row.prop.split(".")[0] as string,
      ...(fixable(f) && whole.length > 0 ? { fix: whole } : {}),
    } satisfies Diagnostic;
  });
}
