import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { z } from "zod";
import { ELEMENTS, KIND_CAPABILITIES, MASKED_KINDS, MASK_NOT_RENDERED, NOT_RENDERED, RENDERED_VALUES, listHandlers } from "../packages/kit/src/index";
import { OURS_ONLY, PARITY } from "../packages/kit/scripts/parity-table";
import { GRAPHIC_KINDS, GRAPHIC_KIND_NAMES, type GraphicKindName } from "../packages/graphics/src/index";
import { graphicExample } from "./graphic-example";

/**
 * Generated reference pages: the element table from the Zod schemas and the
 * capabilities table, the action list from the registered handlers and the
 * parity table, and what renders from `rendering.ts` (the backend copies that
 * page into the agent's SKILL.md). Committed; CI fails when they drift from
 * the code. The kit's spec and parity documents are linked from the sidebar rather than copied:
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
      lines.push("Plus the props of its `kind`: see [Graphics](/reference/graphics/).", "");
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

/** A Vue attribute value: quotes and braces escaped, Markdown code ticks dropped. */
const attr = (text: string): string => text.replace(/`/g, "").replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/\{\{/g, "&#123;&#123;");
/** The first sentence, for a card. */
const firstSentence = (text: string): string => /^.*?[.;](?=\s|$)/.exec(text)?.[0].replace(/;$/, ".") ?? text;
const capital = (s: string): string => `${s[0]!.toUpperCase()}${s.slice(1)}`;

function graphicCategories(): Map<string, string[]> {
  const categories = new Map<string, string[]>();
  for (const name of GRAPHIC_KIND_NAMES) categories.set(GRAPHIC_KINDS[name].category, [...(categories.get(GRAPHIC_KINDS[name].category) ?? []), name]);
  return categories;
}

/** A rendered example: the video, then the code that made it (both from `graphicExample`). */
const example = (src: string, alt: string, code: string): string[] => [`<Example src="${src}" alt="${attr(alt)}">`, "", "```tsx", code, "```", "", "</Example>"];

function graphicsIndex(): string {
  const lines = [
    "# Graphics", "",
    "Built-in kinds of `<Graphic>`: pure functions from props and the theme to SVG, drawn the same in the preview and the export. Each card plays its example as the export renders it; its page has the code. Generated from `packages/graphics`; run `pnpm docs:gen` and `pnpm docs:previews`.", "",
    ...example("previews/graphics/lower-third", "A lower third", graphicExample("lower-third").code), "",
    "Every kind also takes the [`<Graphic>` props](/reference/elements#graphic): timing, `transform`, `enter`/`exit`, `style`, and `width`/`height` for its box. Colours and fonts default to theme tokens.", "",
  ];
  for (const [category, names] of graphicCategories()) {
    lines.push(`## ${capital(category)}`, "", '<div class="cc-cards">');
    for (const name of names) lines.push(`<PreviewCard code title="${name}" link="/reference/graphics/${name}" src="previews/graphics/${name}" text="${attr(firstSentence(GRAPHIC_KINDS[name].description))}" />`);
    lines.push("</div>", "");
  }
  return lines.join("\n");
}

function graphicPage(name: GraphicKindName): string {
  const kind = GRAPHIC_KINDS[name];
  const schema = z.toJSONSchema(z.strictObject(kind.shape), { unrepresentable: "any", io: "input" }) as JsonSchema;
  const lines = [
    `# ${kind.title}`, "",
    `${kind.description}${kind.animated ? " Animated: it changes over its whole duration." : ""}`, "",
    ...example(`previews/graphics/${name}`, kind.title, graphicExample(name).code), "",
    "## Props", "", "| prop | type | default |", "|---|---|---|",
  ];
  for (const [prop, ps] of Object.entries(schema.properties ?? {})) lines.push(`| \`${prop}\` | ${typeOf(ps)} | ${ps.default === undefined ? "" : `\`${JSON.stringify(ps.default)}\``} |`);
  lines.push("", `Plus the [\`<Graphic>\` props](/reference/elements#graphic) every kind takes. More in [${capital(kind.category)}](/reference/graphics/#${kind.category.replace(/ /g, "-")}).`, "");
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

/** Written for an LLM editor: the backend copies it into SKILL.md. Rows that differ only by element are merged. */
function renderingPage(): string {
  const names = new Map(Object.entries(ELEMENTS).map(([name, c]) => [c.kind, `\`<${name}>\``] as const));
  const on = (kinds: string[]): string => kinds.map((k) => (k === "*" ? "any element" : names.get(k) ?? k)).join(", ");
  const merge = <T extends { kind: string }>(rows: readonly T[], key: (r: T) => string): [T, string[]][] => {
    const groups = new Map<string, [T, string[]]>();
    for (const r of rows) {
      const g = groups.get(key(r));
      if (g) g[1].push(r.kind);
      else groups.set(key(r), [r, [r.kind]]);
    }
    return [...groups.values()];
  };
  const code = (v: string): string => `\`${v}\``;
  const why = (reason: string): string => reason.replace(/<\w+>/g, code);
  const lines = [
    "# What renders", "",
    "What the player and the export draw, out of what the schemas accept. Generated from `packages/kit/src/jsx/rendering.ts` by `pnpm docs:gen`; do not edit by hand.", "",
    "The check's `not-rendered` warning reports everything outside these lists, so a file that checks clean renders as written.", "",
    "## Values that render", "",
  ];
  for (const [r, kinds] of merge(RENDERED_VALUES, (r) => `${r.prop}|${r.values.join()}|${r.reason}`)) {
    const only = r.values.length ? `only ${r.values.map(code).join(", ")} render${r.values.length === 1 ? "s" : ""}; any other value` : "no value renders; any value";
    lines.push(`- ${code(r.prop)} on ${on(kinds)}: ${only} ${why(r.reason)}.`);
  }
  lines.push(`- A \`<Mask>\` on an element other than ${on([...MASKED_KINDS])} ${why(MASK_NOT_RENDERED.kind)}; a second \`<Mask>\` ${why(MASK_NOT_RENDERED.second)}.`);
  lines.push("", "## Accepted but not rendered", "", "No value means any value except one that asks for nothing (`false`, `0`, `\"none\"`, `\"all\"`).", "", "| element | prop | value | what happens |", "|---|---|---|---|");
  for (const [r, kinds] of merge(NOT_RENDERED, (r) => `${r.prop}|${r.value}|${r.reason}`)) {
    lines.push(`| ${on(kinds)} | ${r.prop ? code(r.prop) : "the element"} | ${r.value ? code(r.value) : ""} | ${why(r.reason)} |`);
  }
  return lines.join("\n") + "\n";
}

/** VitePress compiles markdown as Vue, so a bare `<Layer>` or `{{ … }}` in prose must be escaped; code spans and fences are left alone. */
function escapeTags(markdown: string): string {
  let fenced = false;
  return markdown.split("\n").map((line) => {
    if (line.trimStart().startsWith("```")) { fenced = !fenced; return line; }
    if (fenced) return line;
    // Our own components and their grid are written on lines of their own, as they are.
    if (/^<\/?(Example|Preview|PreviewCard|div)[\s>]/.test(line)) return line;
    // Outside code: `<Tag` would be a Vue component and `{{ x }}` a Vue interpolation.
    return line.split("`").map((part, i) => (i % 2 === 1 ? part : part.replace(/<(?=[A-Za-z/])/g, "&lt;").replace(/\{\{/g, "&#123;&#123;"))).join("`");
  }).join("\n");
}

writeFileSync(join(out, "elements.md"), escapeTags(elementsPage()));
writeFileSync(join(out, "actions.md"), escapeTags(actionsPage()));
rmSync(join(out, "graphics"), { recursive: true, force: true });
mkdirSync(join(out, "graphics"));
writeFileSync(join(out, "graphics", "index.md"), escapeTags(graphicsIndex()));
for (const name of GRAPHIC_KIND_NAMES) writeFileSync(join(out, "graphics", `${name}.md`), escapeTags(graphicPage(name)));
// The sidebars of the generated sections, read by the site's config.
const sidebar = {
  graphics: [...graphicCategories()].map(([category, names]) => ({ text: capital(category), items: names.map((name) => ({ text: GRAPHIC_KINDS[name].title, link: `/reference/graphics/${name}` })) })),
};
writeFileSync(join(root, "docs", ".vitepress", "sidebar.generated.json"), `${JSON.stringify(sidebar, null, 2)}\n`);
writeFileSync(join(out, "rendering.md"), escapeTags(renderingPage()));
console.log(`docs/reference: elements.md actions.md rendering.md, graphics/ (${GRAPHIC_KIND_NAMES.length + 1} pages)`);
