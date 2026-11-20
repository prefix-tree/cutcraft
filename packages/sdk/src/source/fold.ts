import traverseModule from "@babel/traverse";
import * as t from "@babel/types";

import { ELEMENTS, findFont } from "@uberscene/kit/schema";

import { type NodeSpec, nodeSpecOf } from "../actions/types";
import type { Json, NetPatch, PatchLog } from "../patches/types";
import type { ResolvedState } from "../resolve/resolve";
import { INTERIOR_PREFIX } from "../resolve/tree";
import { bake } from "./bake";
import { applyEdits, lineRange, type SourceEdit } from "./edits";
import { buildSourceIndex, type ElementSite, type SourceIndex } from "./index";
import { declaredIdentifiers } from "./lint/rules/fonts";
import { identifier } from "./lint/rules/theme";
import type { Range } from "./parse";
import { parseSource } from "./parse";
import { escapeText, Identifier, isPlainAttribute, printElement, printLiteral, printProp, printValue } from "./print";

const traverse = ((traverseModule as unknown as { default?: typeof traverseModule }).default ??
  traverseModule) as typeof traverseModule;

/** Structural edits can introduce vocabulary tags the original file never imported. */
function elementImports(text: string): SourceEdit[] {
  const { ast } = parseSource(text);
  const missing = new Set<string>();
  traverse(ast, {
    JSXOpeningElement(path) {
      const name = path.node.name;
      if (t.isJSXIdentifier(name) && Object.hasOwn(ELEMENTS, name.name) && !path.scope.hasBinding(name.name))
        missing.add(name.name);
    },
  });
  if (!missing.size) return [];
  const imports = ast.program.body.filter(t.isImportDeclaration);
  const kitImport = imports.find((node) => node.source.value === "@uberscene/kit" || node.source.value === "@cut/kit");
  const pos = imports.at(-1)?.end ?? ast.program.directives.at(-1)?.end ?? 0;
  const moduleName = kitImport?.source.value ?? "@uberscene/kit";
  return [
    {
      kind: "insert",
      id: "composition",
      range: [pos, pos],
      text: `\nimport { ${[...missing].sort().join(", ")} } from ${JSON.stringify(moduleName)};\n`,
    },
  ];
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
export function fold(
  log: PatchLog,
  index: SourceIndex,
  state: ResolvedState,
): { edits: SourceEdit[]; needsBake: string[]; skipped: FoldResult["skipped"]; fonts: FontsToDeclare } {
  const edits: SourceEdit[] = [];
  const needsBake: string[] = [];
  const skipped: { id: string; reason: string }[] = [];
  const text = index.text;
  const groups = new Map<string, PlacedGroup>();
  // A moved element is printed anew at its destination. Edits to it or inside it are made to that text, not to the
  // original, which is removed: their ranges, by id, and the text they give once applied.
  const movedSites = new Map<string, Range>();
  const movedTexts = new Map<string, string>();
  // An effect, transition or font the file declares is written as its identifier (`type={glitch}`), not as its name.
  const idents = declaredIdentifiers(index);
  // Catalogue families this fold writes that the file does not declare yet: `foldToSource` declares them.
  const fonts: FontsToDeclare = new Map();
  // The weights a font picker asked for (`font/use`), kept on the composition until now.
  const picked = log.net.get("composition")?.props.get("$fonts");
  // New settings rewrite the whole `defaults` literal. A prop bound to one of its keys, edited in the same log, goes
  // into that one edit (written after the loop) rather than a second edit inside the same range.
  const newDefaults = log.net.get("composition")?.props.get("$defaults");
  const settings = index.defaults && isRecord(newDefaults) ? { ...newDefaults } : null;
  const taken = topLevelNames(index);
  const fontValue = (family: Json | undefined): Json | undefined => {
    if (typeof family !== "string") return family;
    const known = idents.get(`font:${family}`);
    if (known) return new Identifier(known) as unknown as Json;
    const listed = findFont(family);
    if (listed?.source !== "google" || listed.family !== family) return family;
    let entry = fonts.get(family);
    if (!entry) {
      let name = identifier(family);
      while (taken.has(name)) name = `${name}Font`;
      taken.add(name);
      const asked = isRecord(picked) && Array.isArray(picked[family]) ? (picked[family] as number[]) : [];
      const weights = asked.length > 0 ? asked : [listed.weights.includes(400) ? 400 : (listed.weights[0] as number)];
      entry = { identifier: name, weights };
      fonts.set(family, entry);
    }
    return new Identifier(entry.identifier) as unknown as Json;
  };
  const declared = (kind: string, prop: string, value: Json | undefined): Json | undefined => {
    // A font where it is nested: a theme's roles, a caption style.
    if (kind === "composition" && prop === "theme" && isRecord(value) && isRecord(value.fonts))
      return {
        ...value,
        fonts: Object.fromEntries(Object.entries(value.fonts).map(([role, family]) => [role, fontValue(family)])),
      } as Json;
    if (kind === "captions" && prop === "style" && isRecord(value) && typeof value.font === "string")
      return { ...value, font: fontValue(value.font) } as Json;
    // An effect the file declares, by the name it is declared under: `effects={[{ type: tone }]}`.
    if (prop === "effects" && Array.isArray(value))
      return value.map((e) => {
        const ident = isRecord(e) && typeof e.type === "string" ? idents.get(`effect:${e.type}`) : undefined;
        return ident && isRecord(e) ? { ...e, type: new Identifier(ident) as unknown as Json } : e;
      }) as Json;
    if (typeof value !== "string") return value;
    if (prop === "font") return fontValue(value);
    const key = prop === "type" && (kind === "effect" || kind === "transition") ? `${kind}:${value}` : null;
    const ident = key ? idents.get(key) : undefined;
    return ident ? (new Identifier(ident) as unknown as Json) : value;
  };
  const withIdentifiers = (spec: NodeSpec): NodeSpec => ({
    ...spec,
    props: Object.fromEntries(Object.entries(spec.props).map(([k, v]) => [k, declared(spec.kind, k, v)])),
    ...(spec.children ? { children: spec.children.map(withIdentifiers) } : {}),
  });

  /**
   * Queue a placed node (inserted or moved) at its insertion point. Siblings
   * that are themselves placed in this net have no usable site yet, so the
   * point is taken from the nearest sibling that sits in the text, and the
   * group keeps the order the overlay produces: an element placed after that
   * anchor goes first, one placed after a queued sibling goes right behind it.
   */
  const place = (id: string, at: PlacedAt, print: (indent: string) => string, from: Range | null): boolean => {
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
    if (!group) {
      group = { point, ids: [], texts: new Map(), moved: new Map() };
      groups.set(key, group);
    }
    group.texts.set(id, () => print(point.indent));
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

  const placements: { id: string; at: PlacedAt; print: (indent: string) => string; from: Range | null }[] = [];
  for (const [id, net] of log.net) {
    if (net.bake) {
      needsBake.push(id);
      continue;
    }
    // A copy: the log keeps "$fonts" and "$defaults", so a second save (or the round after a bake) writes them too.
    const props = new Map(net.props);
    if (id === "composition" && props.has("$fonts")) {
      // Not a prop of the file: the faces it names are declared by `foldToSource`, for the families written here.
      props.delete("$fonts");
      if (props.size === 0 && net.presence === "present" && !net.place && net.text === undefined) continue;
    }
    if (id === "composition" && props.has("$defaults")) {
      const value = props.get("$defaults");
      if (value === undefined || settings) {
        /* undone, nothing to write; or written whole after the loop */
      } else if (index.defaults)
        edits.push({ kind: "defaults", id, range: index.defaults.range, text: printLiteral(value) });
      else skipped.push({ id, reason: "no `export const defaults` literal to rewrite" });
      props.delete("$defaults");
      if (props.size === 0 && net.presence === "present" && !net.place && net.text === undefined) continue;
    }
    switch (net.presence) {
      case "removed": {
        const site = index.elements.get(id);
        if (!site) {
          needsBake.push(id);
          break;
        }
        edits.push({ kind: "remove", id, range: lineRange(text, site.range), text: "" });
        break;
      }
      case "inserted": {
        if (!net.node || !net.place) {
          skipped.push({ id, reason: "insert without a node" });
          break;
        }
        // An id the file still has was removed and put back (an undone delete): its old text goes, the node is printed
        // where it now stands.
        const original = index.elements.get(id);
        if (original) edits.push({ kind: "remove", id, range: lineRange(text, original.range), text: "" });
        if (insertedAncestor(id)) break;
        // The node as it stands now, with the props and children later patches gave it.
        const node = state.tree.byId.get(id) ?? net.node;
        placements.push({
          id,
          at: net.place,
          print: (indent) => printElement(withIdentifiers(nodeSpecOf(node)), indent),
          from: null,
        });
        break;
      }
      case "present": {
        const site = index.elements.get(id);
        if (!site) {
          needsBake.push(id);
          break;
        }
        if (insertedAncestor(id)) {
          // Moved into a subtree this net inserts; the subtree's print carries it, the original goes.
          edits.push({ kind: "remove", id, range: lineRange(text, site.range), text: "" });
          break;
        }
        if (net.place) {
          const original = text.slice(site.range[0], site.range[1]);
          movedSites.set(id, site.range);
          const printMoved = (indent: string) => reindent(movedTexts.get(id) ?? original, site.indent, indent);
          placements.push({ id, at: net.place, print: printMoved, from: lineRange(text, site.range) });
        }
        let newAttrs = -1;
        for (const [prop, value] of props) {
          const key = site.boundProps[prop];
          const handle = prop.startsWith(INTERIOR_PREFIX);
          if (handle && !site.interior && key === undefined) {
            skipped.push({ id, reason: `"${id}" has no handles` });
            continue;
          }
          const target = handle ? { id, props: site.interior!.props, openingTag: site.interior!.openingTag } : site;
          if (key !== undefined && settings && value !== undefined) {
            settings[key] = value;
            continue;
          }
          const e =
            key !== undefined
              ? bindingEdit(index, id, prop, key, value, skipped)
              : propEdit(
                  target,
                  handle ? prop.slice(INTERIOR_PREFIX.length) : prop,
                  handle ? value : declared(site.kind, prop, value),
                  text,
                );
          if (!e) continue;
          if (e.kind === "prop" && e.range[0] === e.range[1]) {
            // New attributes share one insertion point; one edit keeps them in write order.
            const prev = edits[newAttrs];
            if (prev?.kind === "prop" && prev.range[0] === e.range[0]) {
              edits[newAttrs] = { ...prev, text: prev.text + e.text };
              continue;
            }
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
  // Queued in the order they were made, as the overlay places them: two elements put after the same sibling stand
  // latest first, whatever order the net holds them in.
  for (const p of placements.sort((a, b) => a.at.seq - b.at.seq))
    if (!place(p.id, p.at, p.print, p.from)) needsBake.push(p.at.parent);
  if (settings && index.defaults)
    edits.push({ kind: "defaults", id: "composition", range: index.defaults.range, text: printLiteral(settings) });
  const writeGroup = (group: PlacedGroup): void => {
    const printed = group.ids.map((id) => (group.texts.get(id) as () => string)()).join("\n");
    edits.push(insertEdit(index, group.ids[0] as string, group.point, printed));
    for (const [id, from] of group.moved) edits.push({ kind: "remove", id, range: from, text: "" });
  };
  // Groups that move nothing first: an element inserted into a moved element is then one of its inner edits.
  for (const group of groups.values()) if (group.moved.size === 0) writeGroup(group);
  for (const [id, range] of movedSites) {
    const inner: SourceEdit[] = [];
    for (let i = edits.length - 1; i >= 0; i--) {
      const e = edits[i] as SourceEdit;
      if (e.kind !== "move" && e.range[0] >= range[0] && e.range[1] <= range[1]) {
        inner.push({ ...e, range: [e.range[0] - range[0], e.range[1] - range[0]] } as SourceEdit);
        edits.splice(i, 1);
      }
    }
    if (inner.length > 0) movedTexts.set(id, applyEdits(text.slice(range[0], range[1]), inner));
  }
  for (const group of groups.values()) if (group.moved.size > 0) writeGroup(group);
  // A weight the picker asked for of a family the file already declares: the declaration gains it.
  if (isRecord(picked))
    for (const [family, weights] of Object.entries(picked)) {
      const ident = idents.get(`font:${family}`);
      if (ident && !fonts.has(family) && Array.isArray(weights))
        fonts.set(family, { identifier: ident, weights: weights as number[] });
    }
  return { edits: lastWriteWins(withinRemovals(edits)), needsBake: [...new Set(needsBake)], skipped, fonts };
}

/**
 * Edits inside an element that is removed go with it: a keyframe a split moved to the second half, then the first half
 * deleted, is removed once, as part of its clip.
 */
function withinRemovals(edits: SourceEdit[]): SourceEdit[] {
  const removed = edits.filter((e) => e.kind === "remove" && e.range[0] < e.range[1]);
  if (removed.length < 2) return edits;
  const inside = (e: SourceEdit, r: SourceEdit): boolean =>
    r !== e &&
    r.range[0] <= e.range[0] &&
    e.range[1] <= r.range[1] &&
    (r.range[0] < e.range[0] || e.range[1] < r.range[1]);
  return edits.filter((e) => e.kind !== "remove" || !removed.some((r) => inside(e, r)));
}

/** Catalogue families to declare (or whose declaration gains weights), by family. */
type FontsToDeclare = Map<string, { readonly identifier: string; readonly weights: readonly number[] }>;

const isRecord = (v: unknown): v is Record<string, Json> => typeof v === "object" && v !== null && !Array.isArray(v);

/** Every name bound at the top of the file: imports, variables, functions, classes. */
function topLevelNames(index: SourceIndex): Set<string> {
  const names = new Set<string>();
  for (const node of index.ast.program.body) {
    const decl = t.isExportNamedDeclaration(node) || t.isExportDefaultDeclaration(node) ? node.declaration : node;
    if (t.isImportDeclaration(decl)) for (const s of decl.specifiers) names.add(s.local.name);
    else if (t.isVariableDeclaration(decl)) {
      for (const d of decl.declarations) if (t.isIdentifier(d.id)) names.add(d.id.name);
    } else if ((t.isFunctionDeclaration(decl) || t.isClassDeclaration(decl)) && decl.id) names.add(decl.id.name);
  }
  return names;
}

/**
 * Edits that declare the Google families a fold wrote by identifier: `const bebasNeue = googleFont("Bebas Neue");`
 * after the imports, with `googleFont` added to the kit import. A family the file declares already has the weights
 * it lacks added to its `weights`.
 */
function fontDeclarations(text: string, fonts: FontsToDeclare): SourceEdit[] {
  if (fonts.size === 0) return [];
  const { ast } = parseSource(text);
  const edits: SourceEdit[] = [];
  const imports = ast.program.body.filter(t.isImportDeclaration);
  const kitImport = imports.find((node) => node.source.value === "@uberscene/kit" || node.source.value === "@cut/kit");
  const local =
    kitImport?.specifiers.find(
      (s): s is t.ImportSpecifier => t.isImportSpecifier(s) && t.isIdentifier(s.imported, { name: "googleFont" }),
    )?.local.name ?? null;
  const calls = new Map<string, t.CallExpression>();
  if (local)
    for (const node of ast.program.body) {
      const decl = t.isExportNamedDeclaration(node) ? node.declaration : node;
      if (!t.isVariableDeclaration(decl)) continue;
      for (const d of decl.declarations) {
        const call = d.init;
        if (!t.isCallExpression(call) || !t.isIdentifier(call.callee, { name: local })) continue;
        const [family] = call.arguments;
        if (t.isStringLiteral(family) && !calls.has(family.value)) calls.set(family.value, call);
      }
    }
  const fresh: string[] = [];
  for (const [family, { identifier: name, weights }] of fonts) {
    const call = calls.get(family);
    if (!call) {
      const options = weights.length === 1 && weights[0] === 400 ? "" : `, { weights: [${weights.join(", ")}] }`;
      fresh.push(`const ${name} = ${local ?? "googleFont"}(${JSON.stringify(family)}${options});`);
      continue;
    }
    const [first, options] = call.arguments;
    const list = (all: readonly number[]) => `[${[...new Set(all)].sort((a, b) => a - b).join(", ")}]`;
    if (!options) {
      if (weights.every((w) => w === 400)) continue;
      const end = (first as t.Node).end as number;
      edits.push({
        kind: "insert",
        id: "composition",
        range: [end, end],
        text: `, { weights: ${list([400, ...weights])} }`,
      });
    } else if (t.isObjectExpression(options)) {
      const prop = options.properties.find(
        (p): p is t.ObjectProperty => t.isObjectProperty(p) && t.isIdentifier(p.key, { name: "weights" }),
      );
      if (!prop) {
        if (weights.every((w) => w === 400)) continue;
        const start = (options.start as number) + 1;
        edits.push({
          kind: "insert",
          id: "composition",
          range: [start, start],
          text: ` weights: ${list([400, ...weights])},`,
        });
      } else if (t.isArrayExpression(prop.value) && prop.value.elements.every((e) => t.isNumericLiteral(e))) {
        const have = prop.value.elements.map((e) => (e as t.NumericLiteral).value);
        if (weights.every((w) => have.includes(w))) continue;
        edits.push({
          kind: "prop",
          id: "composition",
          prop: "weights",
          range: [prop.value.start as number, prop.value.end as number],
          text: list([...have, ...weights]),
        });
      }
    }
  }
  if (fresh.length > 0) {
    const pos = imports.at(-1)?.end ?? ast.program.directives.at(-1)?.end ?? 0;
    edits.push({ kind: "insert", id: "composition", range: [pos, pos], text: `\n\n${fresh.join("\n")}` });
    if (!local) {
      const named = kitImport?.specifiers.filter(t.isImportSpecifier) ?? [];
      const last = named.at(-1);
      if (last)
        edits.push({
          kind: "insert",
          id: "composition",
          range: [last.end as number, last.end as number],
          text: ", googleFont",
        });
      else {
        const top = imports[0]?.start ?? 0;
        edits.push({
          kind: "insert",
          id: "composition",
          range: [top, top],
          text: `import { googleFont } from "@uberscene/kit";\n`,
        });
      }
    }
  }
  return edits;
}

type PlacedAt = NonNullable<NetPatch["place"]>;

interface PlacedGroup {
  readonly point: InsertionPoint;
  /** In the order the elements will appear. */
  readonly ids: string[];
  /** Each element's text, printed when the group is written, after the edits inside a moved element are known. */
  readonly texts: Map<string, () => string>;
  /** Moved elements: the line range of their original. */
  readonly moved: Map<string, Range>;
}

function lastWriteWins(edits: SourceEdit[]): SourceEdit[] {
  const byRange = new Map<string, number>();
  const keep: SourceEdit[] = [];
  for (const e of edits) {
    if (e.kind !== "defaults") {
      keep.push(e);
      continue;
    }
    const k = `${e.range[0]}:${e.range[1]}`;
    const prev = byRange.get(k);
    if (prev !== undefined) keep[prev] = e;
    else {
      byRange.set(k, keep.length);
      keep.push(e);
    }
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
    const { edits, needsBake, skipped, fonts } = fold(log, index, state);
    if (needsBake.length === 0) {
      allEdits = [...allEdits, ...edits];
      const folded = applyEdits(current, edits);
      const imports = elementImports(folded);
      const withImports = applyEdits(folded, imports);
      const declarations = fontDeclarations(withImports, fonts);
      return {
        text: applyEdits(withImports, declarations),
        edits: [...allEdits, ...imports, ...declarations],
        baked,
        skipped,
      };
    }
    let bakeEdits: SourceEdit[] = [];
    for (const id of needsBake) {
      const result = bake(current, id, state, index);
      if (result.length === 0)
        return {
          text: applyEdits(current, edits),
          edits: [...allEdits, ...edits],
          baked,
          skipped: [...skipped, { id, reason: "cannot bake" }],
        };
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
  return edits.filter((e) => {
    const k = `${e.range[0]}:${e.range[1]}`;
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
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
function bindingEdit(
  index: SourceIndex,
  id: string,
  prop: string,
  key: string,
  value: Json | undefined,
  skipped: { id: string; reason: string }[],
): SourceEdit | null {
  const target = index.defaults?.props.get(key);
  if (value === undefined) {
    skipped.push({ id, reason: `cannot unset "${prop}": it is bound to defaults.${key}` });
    return null;
  }
  if (!target?.valueRange) {
    skipped.push({ id, reason: `"${prop}" is bound to defaults.${key}, which has no literal` });
    return null;
  }
  return { kind: "defaults", id, range: target.valueRange, text: printLiteral(value) };
}

function propEdit(
  site: Pick<ElementSite, "id" | "props" | "openingTag">,
  prop: string,
  value: Json | undefined,
  text: string,
): SourceEdit | null {
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
    const asString = typeof value === "string" && text[existing.valueRange[0]] === '"' && isPlainAttribute(value);
    const lineStart = text.lastIndexOf("\n", existing.range[0] - 1) + 1;
    const indent = /^[ \t]*/.exec(text.slice(lineStart))?.[0] ?? "";
    const replacement = asString ? `"${value}"` : printValue(value, indent, existing.valueRange[0] - lineStart);
    if (asString) return { kind: "prop", id: site.id, prop, range: existing.valueRange, text: replacement };
    // Expression container `{...}` or a string literal that must become `{...}`.
    const r = existing.valueRange;
    const wrapped = text[r[0] - 1] === "{" && text[r[1]] === "}";
    // A plain string replacing `{...}` drops the braces: `out={6}` becomes `out="word:2"`, as a person writes it.
    if (wrapped && typeof value === "string" && isPlainAttribute(value))
      return { kind: "prop", id: site.id, prop, range: [r[0] - 1, r[1] + 1], text: `"${value}"` };
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
  const children = escapeText(value);
  if (site.childrenRange) return { kind: "text", id: site.id, range: site.childrenRange, text: children };
  const slash = site.range[1] - 2;
  return { kind: "text", id: site.id, range: [slash, site.range[1]], text: `>${children}</${site.name}>` };
}

function reindent(source: string, from: string, to: string): string {
  if (from === to) return source;
  return source
    .split("\n")
    .map((line, i) => (i === 0 ? line : line.startsWith(from) ? to + line.slice(from.length) : line))
    .join("\n");
}
