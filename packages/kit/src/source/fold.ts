import { nodeSpecOf } from "../actions/types";
import type { Json, NetPatch, PatchLog } from "../patches/types";
import type { ResolvedState } from "../resolve/resolve";
import type { CollectedNode } from "../resolve/tree";
import { bake } from "./bake";
import { applyEdits, lineRange, type SourceEdit } from "./edits";
import { buildSourceIndex, type ElementSite, type SourceIndex } from "./index";
import { printElement, printLiteral, printProp } from "./print";

export interface FoldResult {
  readonly text: string;
  readonly edits: readonly SourceEdit[];
  readonly baked: readonly string[];
  /** Ids whose patches could not be written (opaque interiors, missing sites). */
  readonly skipped: readonly { readonly id: string; readonly reason: string }[];
}

/**
 * Turn the patch log's net effect into text edits against the index.
 * Targets without a literal site are reported, not folded; `foldToSource`
 * bakes them first and folds again.
 */
export function fold(log: PatchLog, index: SourceIndex, _state: ResolvedState): { edits: SourceEdit[]; needsBake: string[]; skipped: FoldResult["skipped"] } {
  const edits: SourceEdit[] = [];
  const needsBake: string[] = [];
  const skipped: { id: string; reason: string }[] = [];
  const text = index.text;

  for (const [id, net] of log.net) {
    if (net.bake) { needsBake.push(id); continue; }
    if (id === "composition" && net.props.has("$defaults")) {
      const value = net.props.get("$defaults");
      if (value === undefined) { /* the panel change was undone; nothing to write */ }
      else if (index.defaults) edits.push({ kind: "defaults", id, range: index.defaults.range, text: printLiteral(value) });
      else skipped.push({ id, reason: "no `export const defaults` literal to rewrite" });
      net.props.delete("$defaults");
      if (net.props.size === 0 && net.presence === "present" && !net.place && net.text === undefined) continue;
    }
    switch (net.presence) {
      case "removed": {
        const site = index.elements.get(id);
        if (!site) { needsBake.push(id); break; }
        edits.push({ kind: "remove", id, range: lineRange(text, site.range), text: "" });
        break;
      }
      case "inserted": {
        if (!net.node || !net.place) { skipped.push({ id, reason: "insert without a node" }); break; }
        const target = insertionPoint(index, net.place.parent, net.place.after);
        if (!target) { needsBake.push(net.place.parent); break; }
        edits.push(insertEdit(index, id, target, net.node));
        break;
      }
      case "present": {
        const site = index.elements.get(id);
        if (!site) { needsBake.push(id); break; }
        if (net.place) {
          const target = insertionPoint(index, net.place.parent, net.place.after);
          if (!target) { needsBake.push(net.place.parent); break; }
          const original = text.slice(site.range[0], site.range[1]);
          const from = lineRange(text, site.range);
          const reindented = reindent(original, site.indent, target.indent);
          edits.push({ kind: "move", id, from, range: [target.pos, target.pos], text: target.wrap(reindented) });
        }
        for (const [prop, value] of net.props) {
          const key = site.boundProps[prop];
          const e = key !== undefined ? bindingEdit(index, id, prop, key, value, skipped) : propEdit(site, prop, value, text);
          if (e) edits.push(e);
        }
        if (net.text !== undefined) {
          const e = textEdit(site, net.text);
          if (e) edits.push(e);
          else skipped.push({ id, reason: "cannot set text on this element" });
        }
        break;
      }
    }
  }
  return { edits: lastWriteWins(edits), needsBake: [...new Set(needsBake)], skipped };
}

function lastWriteWins(edits: SourceEdit[]): SourceEdit[] {
  const byRange = new Map<string, number>();
  const keep: SourceEdit[] = [];
  for (const e of edits) {
    if (e.kind !== "defaults") { keep.push(e); continue; }
    const k = `${e.range[0]}:${e.range[1]}`;
    const prev = byRange.get(k);
    if (prev !== undefined) keep[prev] = e;
    else { byRange.set(k, keep.length); keep.push(e); }
  }
  return keep;
}

/** Fold with baking: generated targets are baked into literals, the file is re-indexed, and the fold is retried. */
export function foldToSource(text: string, log: PatchLog, state: ResolvedState, maxRounds = 4): FoldResult {
  let current = text;
  const baked: string[] = [];
  let allEdits: SourceEdit[] = [];
  for (let round = 0; round < maxRounds; round++) {
    const index = buildSourceIndex(current);
    const { edits, needsBake, skipped } = fold(log, index, state);
    if (needsBake.length === 0) {
      allEdits = [...allEdits, ...edits];
      return { text: applyEdits(current, edits), edits: allEdits, baked, skipped };
    }
    let bakeEdits: SourceEdit[] = [];
    for (const id of needsBake) {
      const result = bake(current, id, state, index);
      if (result.length === 0) return { text: applyEdits(current, edits), edits: [...allEdits, ...edits], baked, skipped: [...skipped, { id, reason: "cannot bake" }] };
      bakeEdits = [...bakeEdits, ...result];
      baked.push(id);
    }
    current = applyEdits(current, dedupe(bakeEdits));
    allEdits = [...allEdits, ...bakeEdits];
  }
  return { text: current, edits: allEdits, baked, skipped: [{ id: "*", reason: "bake did not converge" }] };
}

function dedupe(edits: SourceEdit[]): SourceEdit[] {
  const seen = new Set<string>();
  return edits.filter((e) => { const k = `${e.range[0]}:${e.range[1]}`; if (seen.has(k)) return false; seen.add(k); return true; });
}

interface InsertionPoint {
  readonly pos: number;
  readonly indent: string;
  /** Wraps printed text: opening a self-closing parent, or adding the newline separators. */
  readonly wrap: (printed: string) => string;
  readonly convertsParent?: ElementSite;
}

function insertionPoint(index: SourceIndex, parentId: string, after: string | null): InsertionPoint | null {
  const text = index.text;
  const parent = index.elements.get(parentId);
  if (!parent) return null;
  const step = "  ";
  if (after !== null) {
    const sibling = index.elements.get(after);
    if (!sibling || sibling.parent !== parentId) return null;
    const end = lineRange(text, sibling.range)[1];
    return { pos: end, indent: sibling.indent, wrap: (p) => `${p}\n` };
  }
  if (parent.childrenRange) {
    // First child: right after the opening tag, on its own line.
    const afterOpen = parent.openingTag[1];
    const nl = text.slice(afterOpen).match(/^[ \t]*\r?\n/);
    const childIndent = parent.indent + step;
    if (nl) return { pos: afterOpen + nl[0].length, indent: childIndent, wrap: (p) => `${p}\n` };
    return { pos: afterOpen, indent: childIndent, wrap: (p) => `\n${p}\n${parent.indent}` };
  }
  // Self-closing parent: replace "/>" by ">" + children + closing tag.
  const open = parent.openingTag;
  const slash = text.lastIndexOf("/>", open[1]);
  if (slash < open[0]) return null;
  return {
    pos: slash,
    indent: parent.indent + step,
    wrap: (p) => `>\n${p}\n${parent.indent}</${parent.name}>`,
    convertsParent: parent,
  };
}

function insertEdit(index: SourceIndex, id: string, target: InsertionPoint, node: CollectedNode): SourceEdit {
  const printed = printElement(nodeSpecOf(node), target.indent);
  if (target.convertsParent) {
    const open = target.convertsParent.openingTag;
    const before = index.text.slice(open[1] - 2, open[1]) === "/>" ? open[1] - 2 : target.pos;
    // Also drop a space before "/>" so `<Clip id="x" />` becomes `<Clip id="x">`.
    const start = index.text[before - 1] === " " ? before - 1 : before;
    return { kind: "insert", id, range: [start, open[1]], text: target.wrap(printed) };
  }
  return { kind: "insert", id, range: [target.pos, target.pos], text: target.wrap(printed) };
}

/**
 * A prop bound to a `schema` key keeps its reference; the value goes into
 * the `defaults` literal, so every element reading that key follows. Two
 * elements writing the same key in one fold would collide on the same
 * range, so the later write wins and the earlier edit is dropped.
 */
function bindingEdit(index: SourceIndex, id: string, prop: string, key: string, value: Json | undefined, skipped: { id: string; reason: string }[]): SourceEdit | null {
  const target = index.defaults?.props.get(key);
  if (value === undefined) { skipped.push({ id, reason: `cannot unset "${prop}": it is bound to defaults.${key}` }); return null; }
  if (!target || !target.valueRange) { skipped.push({ id, reason: `"${prop}" is bound to defaults.${key}, which has no literal` }); return null; }
  return { kind: "defaults", id, range: target.valueRange, text: printLiteral(value) };
}

function propEdit(site: ElementSite, prop: string, value: Json | undefined, text: string): SourceEdit | null {
  const existing = site.props.get(prop);
  if (value === undefined) {
    if (!existing) return null;
    // Remove the attribute and the whitespace before it.
    let start = existing.range[0];
    while (start > site.openingTag[0] && /\s/.test(text[start - 1] as string)) start -= 1;
    return { kind: "prop", id: site.id, prop, range: [start, existing.range[1]], text: "" };
  }
  if (existing) {
    if (existing.valueRange === null) {
      // Bare attribute (`reverse`): rewrite the whole attribute.
      return { kind: "prop", id: site.id, prop, range: existing.range, text: printProp(prop, value) };
    }
    const asString = typeof value === "string" && text[existing.valueRange[0]] === '"' && !value.includes('"') && !value.includes("\n");
    const replacement = asString ? `"${value}"` : printLiteral(value);
    if (asString) return { kind: "prop", id: site.id, prop, range: existing.valueRange, text: replacement };
    // Expression container `{...}` or a string literal that must become `{...}`.
    const r = existing.valueRange;
    const wrapped = text[r[0] - 1] === "{" && text[r[1]] === "}";
    if (wrapped) return { kind: "prop", id: site.id, prop, range: r, text: replacement };
    return { kind: "prop", id: site.id, prop, range: r, text: `{${replacement}}` };
  }
  // New attribute: before `/>` or `>` of the opening tag.
  const open = site.openingTag;
  const selfClosing = text.slice(open[1] - 2, open[1]) === "/>";
  let pos = selfClosing ? open[1] - 2 : open[1] - 1;
  while (pos > open[0] && /\s/.test(text[pos - 1] as string)) pos -= 1;
  return { kind: "prop", id: site.id, prop, range: [pos, pos], text: ` ${printProp(prop, value)}` };
}

function textEdit(site: ElementSite, value: string): SourceEdit | null {
  if (site.childrenRange) return { kind: "text", id: site.id, range: site.childrenRange, text: value };
  const open = site.openingTag;
  const slash = site.range[1] - 2;
  let start = slash;
  while (start > open[0] && /\s/.test(site.indent) && /\s/.test(value[start - 1] ?? "")) start -= 1;
  return { kind: "text", id: site.id, range: [slash, site.range[1]], text: `>${value}</${site.name}>` };
}

function reindent(source: string, from: string, to: string): string {
  if (from === to) return source;
  return source.split("\n").map((line, i) => (i === 0 ? line : line.startsWith(from) ? to + line.slice(from.length) : line)).join("\n");
}

export type { NetPatch };
