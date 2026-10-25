import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { z } from "zod";
import { ELEMENTS, KIND_CAPABILITIES, listHandlers } from "../packages/kit/src/index";
import { OURS_ONLY, PARITY } from "../packages/kit/scripts/parity-table";
import { GRAPHIC_KINDS, GRAPHIC_KIND_NAMES } from "../packages/graphics/src/index";

/**
 * Generated reference pages: the element table from the Zod schemas and the
 * capabilities table, the action list from the registered handlers and the
 * parity table. Committed; CI fails when they drift from the code. The kit's
 * spec and parity documents are linked from the sidebar rather than copied:
 * their prose carries JSX and braces that VitePress would compile as Vue.
 */
const root = join(import.meta.dirname, "..");
const out = join(root, "docs", "reference");
mkdirSync(out, { recursive: true });

type JsonSchema = { type?: string | string[]; enum?: unknown[]; const?: unknown; anyOf?: JsonSchema[]; oneOf?: JsonSchema[]; items?: JsonSchema; properties?: Record<string, JsonSchema>; required?: string[]; default?: unknown; description?: string; minimum?: number; maximum?: number };

function typeOf(s: JsonSchema): string {
  if (s.enum) return s.enum.map((v) => JSON.stringify(v)).join(" \\| ");
  if (s.const !== undefined) return JSON.stringify(s.const);
  const alts = s.anyOf ?? s.oneOf;
  if (alts) return [...new Set(alts.map(typeOf))].join(" \\| ");
  if (s.type === "array") return `${s.items ? typeOf(s.items) : "unknown"}[]`;
  if (s.type === "object") return s.properties ? `{ ${Object.keys(s.properties).join(", ")} }` : "object";
  if (Array.isArray(s.type)) return s.type.join(" \\| ");
  if (s.type === "number" && (s.minimum !== undefined || s.maximum !== undefined)) return `number (${s.minimum ?? "−∞"}..${s.maximum ?? "∞"})`;
  return s.type ?? "any";
}

function elementsPage(): string {
  const lines: string[] = ["# Elements", "", "Generated from the Zod schemas in `packages/kit/src/jsx/schemas` and the capabilities table. Do not edit by hand; run `pnpm docs:gen`.", ""];
  lines.push("## Capabilities", "", "| element | timed | visual | audio | trims source | transformable | children allowed |", "|---|---|---|---|---|---|---|");
  for (const [name, component] of Object.entries(ELEMENTS)) {
    const c = KIND_CAPABILITIES[component.kind]!;
    const yes = (b: boolean): string => (b ? "yes" : "");
    lines.push(`| \`<${name}>\` | ${yes(c.timed)} | ${yes(c.visual)} | ${yes(c.audio)} | ${yes(c.trimSource)} | ${yes(c.transformable)} | ${c.childKinds.map((k) => `\`${k}\``).join(", ")} |`);
  }
  for (const [name, component] of Object.entries(ELEMENTS)) {
    let schema = z.toJSONSchema(component.schema as z.ZodType, { unrepresentable: "any", io: "input" }) as JsonSchema;
    lines.push("", `## \`<${name}>\``, "");
    if (name === "Graphic") {
      // One schema per kind: show the props every graphic takes; the kinds' own are on the graphics page.
      const own = new Set(GRAPHIC_KIND_NAMES.flatMap((k) => Object.keys(GRAPHIC_KINDS[k].shape)));
      const first = (schema.oneOf ?? schema.anyOf ?? [])[0] ?? {};
      const properties = Object.fromEntries(Object.entries(first.properties ?? {}).filter(([k]) => !own.has(k)));
      schema = { ...first, properties: { ...properties, kind: { enum: [...GRAPHIC_KIND_NAMES] } } };
      lines.push("Plus the props of its `kind`: see [Graphics](./graphics).", "");
    }
    lines.push("| prop | type | default | required |", "|---|---|---|---|");
    const required = new Set(schema.required ?? []);
    for (const [prop, s] of Object.entries(schema.properties ?? {})) {
      const def = s.default === undefined ? "" : `\`${JSON.stringify(s.default)}\``;
      lines.push(`| \`${prop}\` | ${typeOf(s)} | ${def} | ${required.has(prop) ? "yes" : ""} |`);
    }
  }
  return lines.join("\n") + "\n";
}

function graphicsPage(): string {
  const lines = [
    "# Graphics", "",
    "The built-in kinds of `<Graphic>`, generated from `packages/graphics`. Do not edit by hand; run `pnpm docs:gen` (and `pnpm docs:graphics` for the pictures).", "",
    "Every graphic also takes the props on the [Graphic element](./elements#graphic): timing, `transform`, `enter`/`exit`, `style`, and `width`/`height` to size its box. Colour and font defaults are theme tokens, so a graphic follows the theme unless you set them.", "",
    "![Every kind in the midnight theme](/graphics/sheet.png)", "",
  ];
  const categories = new Map<string, string[]>();
  for (const name of GRAPHIC_KIND_NAMES) categories.set(GRAPHIC_KINDS[name].category, [...(categories.get(GRAPHIC_KINDS[name].category) ?? []), name]);
  for (const [category, names] of categories) {
    lines.push(`## ${category[0]!.toUpperCase()}${category.slice(1)}`, "");
    for (const name of names) {
      const kind = GRAPHIC_KINDS[name];
      const schema = z.toJSONSchema(z.strictObject(kind.shape), { unrepresentable: "any", io: "input" }) as JsonSchema;
      const example = Object.entries(kind.example).map(([k, v]) => (typeof v === "string" ? ` ${k}="${v}"` : ` ${k}={${JSON.stringify(v)}}`)).join("");
      lines.push(`### \`${name}\``, "", `${kind.description}${kind.animated ? " Animated." : ""}`, "", `![${kind.title}](/graphics/${name}.png)`, "", "```tsx", `<Graphic id="g1" kind="${name}"${example} start={0} duration={3} />`, "```", "");
      lines.push("| prop | type | default |", "|---|---|---|");
      for (const [prop, ps] of Object.entries(schema.properties ?? {})) lines.push(`| \`${prop}\` | ${typeOf(ps)} | ${ps.default === undefined ? "" : `\`${JSON.stringify(ps.default)}\``} |`);
      lines.push("");
    }
  }
  return lines.join("\n");
}

function actionsPage(): string {
  const byOurs = new Map<string, string[]>();
  for (const [openreel, ours] of PARITY) {
    for (const key of ours.split(",").map((s) => s.trim().split(" ")[0]!)) byOurs.set(key, [...(byOurs.get(key) ?? []), openreel]);
  }
  const notes = new Map(OURS_ONLY.map(([type, note]) => [type, note] as const));
  const groups = new Map<string, string[]>();
  for (const type of listHandlers()) {
    const ns = type.split("/")[0]!;
    groups.set(ns, [...(groups.get(ns) ?? []), type]);
  }
  const lines = ["# Actions", "", `Generated from the registered handlers (${listHandlers().length}) and the parity table. Do not edit by hand; run \`pnpm docs:gen\`.`, "", "Every action has `validate`, `apply`, `invert` and `fold`; the inverse is never null. Params are typed in `packages/kit/src/actions/types/index.ts`.", ""];
  for (const [ns, types] of [...groups].sort()) {
    lines.push(`## \`${ns}/\``, "", "| action | OpenReel counterpart | note |", "|---|---|---|");
    for (const type of [...types].sort()) {
      const counterparts = byOurs.get(type) ?? [];
      lines.push(`| \`${type}\` | ${counterparts.map((c) => `\`${c}\``).join(", ") || "—"} | ${notes.get(type) ?? ""} |`);
    }
    lines.push("");
  }
  return lines.join("\n");
}

/** VitePress compiles markdown as Vue, so a bare `<Layer>` or `{{ … }}` in prose must be escaped; code spans and fences are left alone. */
function escapeTags(markdown: string): string {
  let fenced = false;
  return markdown.split("\n").map((line) => {
    if (line.trimStart().startsWith("```")) { fenced = !fenced; return line; }
    if (fenced) return line;
    // Outside code: `<Tag` would be a Vue component and `{{ x }}` a Vue interpolation.
    return line.split("`").map((part, i) => (i % 2 === 1 ? part : part.replace(/<(?=[A-Za-z/])/g, "&lt;").replace(/\{\{/g, "&#123;&#123;"))).join("`");
  }).join("\n");
}

writeFileSync(join(out, "elements.md"), escapeTags(elementsPage()));
writeFileSync(join(out, "actions.md"), escapeTags(actionsPage()));
writeFileSync(join(out, "graphics.md"), escapeTags(graphicsPage()));
console.log("docs/reference: elements.md actions.md graphics.md");
