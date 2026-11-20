// Placing a component in a video as text: the import line and a `<Layer>` that holds it, written into a track the
// way a person would write them. This is how `uberscene blocks add --into` places a block; the editor's actions edit
// the placement afterwards like any Layer, and its component's props through `layer/setProps`.
import * as t from "@babel/types";

import type { Json } from "../patches/types";
import { applyEdits, type SourceEdit } from "./edits";
import { buildSourceIndex } from "./index";
import { parseSource } from "./parse";
import { printProp } from "./print";

export interface LayerPlacement {
  /** The track the Layer goes into, as its last child. */
  readonly track: string;
  /** The Layer's id; it must not be taken. */
  readonly id: string;
  /** The component placed inside it, by the name the module exports. */
  readonly component: string;
  /** Where the component is imported from: `./blocks/hundred-cells`. */
  readonly from: string;
  /** The Layer's timing props: `start`, or `anchor` with `at` and `offset`, and `duration`. */
  readonly timing: Readonly<Record<string, Json>>;
  /** Props written on the component; left out, it takes its own defaults. */
  readonly props?: Readonly<Record<string, Json>>;
}

/**
 * The text with the component imported (unless the file already imports that name) and a `<Layer>` holding it at the
 * end of the track. A missing track, a taken id, or a name the file already binds to something else is an error.
 */
export function insertLayer(text: string, placement: LayerPlacement): string {
  const index = buildSourceIndex(text);
  const track = index.elements.get(placement.track);
  if (track?.kind !== "track") throw new Error(`there is no <Track id="${placement.track}"> in the file`);
  if (index.elements.has(placement.id)) throw new Error(`the id "${placement.id}" is taken in the file`);

  const edits: SourceEdit[] = [];
  const layerImport = kitImportEdit(text, placement.id);
  if (layerImport) edits.push(layerImport);
  const imported = importOf(text, placement.component);
  if (imported === undefined) edits.push(importEdit(text, placement));
  else if (imported !== placement.from)
    throw new Error(`the file already imports ${placement.component} from "${imported}", not "${placement.from}"`);

  const step = "  ";
  const indent = track.indent + step;
  const attrs = (props: Readonly<Record<string, Json>>) =>
    Object.entries(props)
      .map(([k, v]) => printProp(k, v))
      .filter(Boolean)
      .join(" ");
  const layerAttrs = attrs({ id: placement.id, ...placement.timing });
  const inner = attrs(placement.props ?? {});
  const layer = [
    `${indent}<Layer ${layerAttrs}>`,
    `${indent}${step}<${placement.component}${inner ? ` ${inner}` : ""} />`,
    `${indent}</Layer>`,
  ].join("\n");

  if (track.closingTag) {
    // Before the line that closes the track.
    const lineStart = text.lastIndexOf("\n", track.closingTag[0] - 1) + 1;
    const onOwnLine = /^[ \t]*$/.test(text.slice(lineStart, track.closingTag[0]));
    edits.push(
      onOwnLine
        ? { kind: "insert", id: placement.id, range: [lineStart, lineStart], text: `${layer}\n` }
        : {
            kind: "insert",
            id: placement.id,
            range: [track.closingTag[0], track.closingTag[0]],
            text: `\n${layer}\n${track.indent}`,
          },
    );
  } else {
    // A self-closing track opens to hold it.
    const slash = text.lastIndexOf("/>", track.openingTag[1]);
    const start = text[slash - 1] === " " ? slash - 1 : slash;
    edits.push({
      kind: "text",
      id: placement.track,
      range: [start, track.openingTag[1]],
      text: `>\n${layer}\n${track.indent}</${track.name}>`,
    });
  }
  return applyEdits(text, edits);
}

/** Where the file imports `name` from, if it does. */
function importOf(text: string, name: string): string | undefined {
  const { ast } = parseSource(text);
  for (const node of ast.program.body) {
    if (!t.isImportDeclaration(node)) continue;
    for (const s of node.specifiers) if (s.local.name === name) return node.source.value;
  }
  for (const statement of ast.program.body) {
    const node =
      (t.isExportNamedDeclaration(statement) || t.isExportDefaultDeclaration(statement)) && statement.declaration
        ? statement.declaration
        : statement;
    const declared =
      (t.isFunctionDeclaration(node) || t.isClassDeclaration(node)) && node.id?.name === name
        ? true
        : t.isVariableDeclaration(node) && node.declarations.some((d) => t.isIdentifier(d.id) && d.id.name === name);
    if (declared) throw new Error(`the file already declares ${name}; place the component under another name`);
  }
  return undefined;
}

/** The import line, after the file's last import, in a group of its own when the last import is a package. */
function importEdit(text: string, placement: LayerPlacement): SourceEdit {
  const { ast } = parseSource(text);
  const imports = ast.program.body.filter(t.isImportDeclaration);
  const last = imports.at(-1);
  const line = `import { ${placement.component} } from ${JSON.stringify(placement.from)};`;
  if (!last) return { kind: "insert", id: placement.id, range: [0, 0], text: `${line}\n\n` };
  const local = last.source.value.startsWith(".");
  const pos = last.end ?? 0;
  return { kind: "insert", id: placement.id, range: [pos, pos], text: local ? `\n${line}` : `\n\n${line}` };
}

const KIT = ["@uberscene/kit", "@cut/kit"];

/** `Layer` added to the file's import from the kit, or a kit import of its own, unless the file has it already. */
function kitImportEdit(text: string, id: string): SourceEdit | null {
  const { ast } = parseSource(text);
  const imports = ast.program.body.filter(t.isImportDeclaration);
  if (imports.some((node) => node.specifiers.some((s) => s.local.name === "Layer"))) return null;
  const kit = imports.find((node) => KIT.includes(node.source.value) && node.importKind !== "type");
  const named = kit?.specifiers.filter(t.isImportSpecifier) ?? [];
  if (kit && named.length > 0 && named.length === kit.specifiers.length) {
    // Keep the list in order: written again with Layer among the names, each as it was written.
    const parts = named.map((s) => ({ name: s.local.name, text: text.slice(s.start ?? 0, s.end ?? 0) }));
    parts.push({ name: "Layer", text: "Layer" });
    parts.sort((a, b) => a.name.localeCompare(b.name, "en", { sensitivity: "base" }));
    const first = named[0] as t.ImportSpecifier;
    const last = named.at(-1) as t.ImportSpecifier;
    return { kind: "text", id, range: [first.start ?? 0, last.end ?? 0], text: parts.map((p) => p.text).join(", ") };
  }
  const pos = imports.at(-1)?.end ?? 0;
  const line = 'import { Layer } from "@uberscene/kit";';
  return { kind: "insert", id, range: [pos, pos], text: pos === 0 ? `${line}\n` : `\n${line}` };
}
