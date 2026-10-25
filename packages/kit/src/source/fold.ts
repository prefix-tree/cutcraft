import { nodeSpecOf } from "../actions/types";
import type { Json, NetPatch, PatchLog } from "../patches/types";
import type { ResolvedState } from "../resolve/resolve";
import { INTERIOR_PREFIX } from "../resolve/tree";
import { bake } from "./bake";
import { applyEdits, lineRange, type SourceEdit } from "./edits";
import type { Range } from "./parse";
import { buildSourceIndex, type ElementSite, type SourceIndex } from "./index";
import { printElement, printLiteral, printProp } from "./print";
import traverseModule from "@babel/traverse";
import * as t from "@babel/types";
import { ELEMENTS } from "../jsx/elements";
import { parseSource } from "./parse";

const traverse = ((traverseModule as unknown as { default?: typeof traverseModule }).default ?? traverseModule) as typeof traverseModule;

/** Structural edits can introduce vocabulary tags the original file never imported. */
function elementImports(text: string): SourceEdit[] {
  const { ast } = parseSource(text);
  const missing = new Set<string>();
  traverse(ast, {
    JSXOpeningElement(path) {
      const name = path.node.name;
      if (t.isJSXIdentifier(name) && Object.hasOwn(ELEMENTS, name.name) && !path.scope.hasBinding(name.name)) missing.add(name.name);
    },
  });
  if (!missing.size) return [];
  const imports = ast.program.body.filter(t.isImportDeclaration);
  const kitImport = imports.find((node) => node.source.value === "@cutcut/kit" || node.source.value === "@cut/kit");
  const pos = (imports.at(-1)?.end ?? ast.program.directives.at(-1)?.end) ?? 0;
  const moduleName = kitImport?.source.value ?? "@cutcut/kit";
  return [{ kind: "insert", id: "composition", range: [pos, pos], text: `\nimport { ${[...missing].sort().join(", ")} } from ${JSON.stringify(moduleName)};\n` }];
}

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
export function fold(log: PatchLog, index: SourceIndex, state: ResolvedState): { edits: SourceEdit[]; needsBake: string[]; skipped: FoldResult["skipped"] } {
  const edits: SourceEdit[] = [];
  const needsBake: string[] = [];
  const skipped: { id: string; reason: string }[] = [];
  const text = index.text;
  const groups = new Map<string, PlacedGroup>();

  /**
   * Queue a placed node (inserted or moved) at its insertion point. Siblings
   * that are themselves placed in this net have no usable site yet, so the
   * point is taken from the nearest sibling that sits in the text, and the
   * group keeps the order the overlay produces: an element placed after that
   * anchor goes first, one placed after a queued sibling goes right behind it.
   */
  const place = (id: string, at: { parent: string; after: string | null }, print: (indent: string) => string, from: Range | null): boolean => {
    let anchor = at.after;
    while (anchor !== null) {
      const sibling = log.net.get(anchor);
      if (!sibling?.place || sibling.place.parent !== at.parent) break;
      anchor = sibling.place.after;
    }
    const point = insertionPoint(index, at.parent, anchor);
    if (!point) return false;
    const key = `${at.parent}\u0000${anchor ?? ""}`;
    let group = groups.get(key);
    if (!group) { group = { point, ids: [], texts: new Map(), moved: new Map() }; groups.set(key, group); }
    group.texts.set(id, print(point.indent));
    if (from) group.moved.set(id, from);
    const behind = at.after === anchor ? -1 : group.ids.indexOf(at.after as string);
    group.ids.splice(behind + 1, 0, id);
    return true;
  };

  /** The nearest ancestor inserted by this net: its printed subtree already carries this node. */
  const insertedAncestor = (id: string): string | null => {
    for (let node = state.tree.byId.get(id); node && node.parent !== null; node = state.tree.byId.get(node.parent)) {
      if (log.net.get(node.parent)?.presence === "inserted") return node.parent;
    }
    return null;
  };

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
        if (insertedAncestor(id)) break;
        // The node as it stands now, with the props and children later patches gave it.
        const node = state.tree.byId.get(id) ?? net.node;
        if (!place(id, net.place, (indent) => printElement(nodeSpecOf(node), indent), null)) needsBake.push(net.place.parent);
        break;
      }
      case "present": {
        const site = index.elements.get(id);
        if (!site) { needsBake.push(id); break; }
        if (insertedAncestor(id)) {
          // Moved into a subtree this net inserts; the subtree's print carries it, the original goes.
          edits.push({ kind: "remove", id, range: lineRange(text, site.range), text: "" });
          break;
        }
        if (net.place) {
          const original = text.slice(site.range[0], site.range[1]);
          if (!place(id, net.place, (indent) => reindent(original, site.indent, indent), lineRange(text, site.range))) needsBake.push(net.place.parent);
        }
        let newAttrs = -1;
        for (const [prop, value] of net.props) {
          const key = site.boundProps[prop];
          const handle = prop.startsWith(INTERIOR_PREFIX);
          if (handle && !site.interior && key === undefined) { skipped.push({ id, reason: `"${id}" has no handles` }); continue; }
          const target = handle ? { id, props: site.interior!.props, openingTag: site.interior!.openingTag } : site;
          const e = key !== undefined ? bindingEdit(index, id, prop, key, value, skipped) : propEdit(target, handle ? prop.slice(INTERIOR_PREFIX.length) : prop, value, text);
          if (!e) continue;
          if (e.kind === "prop" && e.range[0] === e.range[1]) {
            // New attributes share one insertion point; one edit keeps them in write order.
            const prev = edits[newAttrs];
            if (prev?.kind === "prop" && prev.range[0] === e.range[0]) { edits[newAttrs] = { ...prev, text: prev.text + e.text }; continue; }
            newAttrs = edits.length;
          }
          edits.push(e);
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
  for (const group of groups.values()) {
    const printed = group.ids.map((id) => group.texts.get(id) as string).join("\n");
    edits.push(insertEdit(index, group.ids[0] as string, group.point, printed));
    for (const [id, from] of group.moved) edits.push({ kind: "remove", id, range: from, text: "" });
  }
  return { edits: lastWriteWins(edits), needsBake: [...new Set(needsBake)], skipped };
}

interface PlacedGroup {
  readonly point: InsertionPoint;
  /** In the order the elements will appear. */
  readonly ids: string[];
  readonly texts: Map<string, string>;
  /** Moved elements: the line range of their original. */
  readonly moved: Map<string, Range>;
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
      const folded = applyEdits(current, edits);
      const imports = elementImports(folded);
      return { text: applyEdits(folded, imports), edits: [...allEdits, ...imports], baked, skipped };
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

function insertEdit(index: SourceIndex, id: string, target: InsertionPoint, printed: string): SourceEdit {
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

function propEdit(site: Pick<ElementSite, "id" | "props" | "openingTag">, prop: string, value: Json | undefined, text: string): SourceEdit | null {
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
