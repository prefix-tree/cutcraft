import { existsSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { z } from "zod";
import { ELEMENTS, ENGINE_LAYERS, KIND_CAPABILITIES, MASKED_KINDS, MASK_NOT_RENDERED, NOT_RENDERED, RENDERED_VALUES, listHandlers } from "../packages/kit/src/index";
import { OURS_ONLY } from "../packages/kit/scripts/parity-table";
import { GRAPHIC_KINDS, GRAPHIC_KIND_NAMES, type GraphicKindName } from "../packages/graphics/src/index";
import { graphicExample } from "./graphic-example";

/**
 * Generated reference pages: the element table from the Zod schemas and the
 * capabilities table, the action list from the registered handlers, and what renders from `rendering.ts` (the backend copies that
 * page into the agent's SKILL.md). Committed; CI fails when they drift from
 * the code.
 */
const root = join(import.meta.dirname, "..");
const out = join(root, "docs", "reference");
mkdirSync(out, { recursive: true });

type JsonSchema = { type?: string | string[]; enum?: unknown[]; const?: unknown; anyOf?: JsonSchema[]; oneOf?: JsonSchema[]; items?: JsonSchema; properties?: Record<string, JsonSchema>; required?: string[]; default?: unknown; description?: string; minimum?: number; maximum?: number };

/** A prop's type for a table; `limit` cuts a long list of values short, saying how many more. */
function typeOf(s: JsonSchema, limit = Infinity): string {
  if (s.enum) return s.enum.length > limit ? `${s.enum.slice(0, limit - 1).map((v) => JSON.stringify(v)).join(" \\| ")} \\| … ${s.enum.length - limit + 1} more` : s.enum.map((v) => JSON.stringify(v)).join(" \\| ");
  if (s.const !== undefined) return JSON.stringify(s.const);
  const alts = s.anyOf ?? s.oneOf;
  if (alts) return [...new Set(alts.map((a) => typeOf(a, limit)))].join(" \\| ");
  if (s.type === "array") return `${s.items ? typeOf(s.items) : "unknown"}[]`;
  if (s.type === "object") return s.properties ? `{ ${Object.keys(s.properties).join(", ")} }` : "object";
  if (Array.isArray(s.type)) return s.type.join(" \\| ");
  if (s.type === "number" && (s.minimum !== undefined || s.maximum !== undefined)) return `number (${s.minimum ?? "−∞"}..${s.maximum ?? "∞"})`;
  return s.type ?? "any";
}

/** What each element is for, by group: the index's cards and the first line of each page. */
const ELEMENT_DOCS: Record<string, readonly (readonly [element: string, summary: string])[]> = {
  "Timeline": [
    ["Composition", "The video: frame rate, size, background and theme. It ends where its content ends."],
    ["Track", "A row of elements. A sequence track plays its children back to back; a free track (`layout=\"free\"`) places each at its own start."],
    ["Clip", "A stretch of a video or image asset, trimmed by seconds, transcript words or camera shots, with speed, fit and transform."],
    ["Gap", "Empty time between clips on a sequence track."],
    ["Transition", "A blend between the two clips it sits between on a sequence track."],
    ["Marker", "A named point on the timeline."],
  ],
  "Free code": [
    ["Layer", "Free code in the frame: any React, CSS, canvas or WebGL, placed on the timeline like any overlay; `useT()` is its time."],
    ["Three", "A three.js scene on the timeline: plain three.js in `setup`, or React Three Fiber children, on the video's clock."],
    ["Motion", "Children animated by a Motion `sequence` on the video's clock."],
  ],
  "Text and graphics": [
    ["Title", "Text over the picture in the theme's type, with entrances by letter, word or line."],
    ["Captions", "Subtitles from an asset's transcript that follow the clips through every trim."],
    ["Caption", "One cue inside `<Captions>`, written by hand: its text, start and end."],
    ["Graphic", "A built-in graphic by `kind`: lower thirds, callouts, counters, progress and more."],
    ["Shape", "A vector shape (rectangle, circle, star, polygon, path) with fill, stroke and shadow."],
    ["Svg", "One-off vector art from inline SVG markup or a file."],
    ["Sticker", "A ready-made icon or sticker by name."],
  ],
  "Effects and colour": [
    ["Effect", "A filter on its parent: brightness, blur, grayscale, vignette, grain and more."],
    ["Adjustment", "Filters everything beneath it for its own stretch of time."],
    ["ColorGrade", "Temperature and tint on its parent."],
    ["Mask", "Shows only a shape of its clip, with a feathered edge or inverted."],
  ],
  "Motion and time": [
    ["Keyframe", "Animates one property of its parent between values, with easing."],
    ["SpeedKey", "Changes its clip's speed from a moment on, eased: speed ramps."],
    ["Freeze", "Holds one frame of its clip for a while, then plays on."],
  ],
  "Structure": [
    ["Nested", "A sequence written once as a component and placed like a clip."],
    ["Multicam", "Several camera angles of one take; `<Cut>`s pick which one shows."],
    ["Angle", "One camera of a `<Multicam>`: its asset and sync offset."],
    ["Cut", "Switches a `<Multicam>` to an angle at a moment."],
  ],
  "Sound": [
    ["Audio", "A stretch of a sound asset: volume, fades, ducking under another track, automation."],
    ["AudioEffect", "An effect on an `<Audio>`'s sound."],
  ],
};
/** Elements with no rendered example (the Node export does not draw them yet): code, and a note. */
const CODE_ONLY: Record<string, string> = {
  Three: `<Three id="cube" anchor="hook" at="word:14" duration={4}
  camera={{ position: [0, 0, 5], fov: 40 }} background="#101010"
  setup={({ scene, THREE }) => {
    const cube = new THREE.Mesh(new THREE.BoxGeometry(), new THREE.MeshNormalMaterial());
    scene.add(cube);
    return ({ time }) => { cube.rotation.set(time * 0.6, time, 0); };
  }}
/>`,
  Motion: `<Motion id="headline" anchor="hook" duration={3}
  sequence={[
    ["h1", { opacity: [0, 1], y: [40, 0] }, { duration: 0.6 }],
    [".rule", { scaleX: [0, 1] }, { at: 0.3, duration: 0.8 }],
  ]}>
  <h1>Launch</h1>
  <div className="rule" />
</Motion>`,
};
/** Elements shown by another's example: the parent they live in. */
const EXAMPLE_OF: Record<string, string> = { Angle: "multicam", Cut: "multicam", Caption: "captions" };
const EXAMPLES = join(root, "examples", "showcase", "docs");
const exampleFor = (name: string): string | null => {
  const file = EXAMPLE_OF[name] ?? name.toLowerCase();
  return existsSync(join(EXAMPLES, `${file}.tsx`)) ? file : null;
};
const slug = (name: string): string => name.toLowerCase();

function elementsIndex(): string {
  const lines = [
    "# Elements", "",
    "The elements a file is written in: the timeline (clips, tracks, transitions, captions), free code, and ready-made titles, graphics and effects. Each page shows an example as the export renders it, with the file that made it, then the element's props. Generated from the Zod schemas in `packages/kit/src/jsx/schemas`; run `pnpm docs:gen`, and `pnpm docs:examples` for the videos.", "",
  ];
  for (const [group, items] of Object.entries(ELEMENT_DOCS)) {
    lines.push(`## ${group}`, "", '<div class="cc-cards">');
    for (const [name, summary] of items) {
      const ex = exampleFor(name);
      lines.push(`<PreviewCard code title="<${name}>" link="/reference/elements/${slug(name)}"${ex ? ` src="previews/elements/${ex}"` : ""} text="${attr(summary)}" />`);
    }
    lines.push("</div>", "");
  }
  lines.push("## Capabilities", "", "| element | timed | visual | audio | trims source | transformable | children allowed |", "|---|---|---|---|---|---|---|");
  for (const [name, component] of Object.entries(ELEMENTS)) {
    const c = KIND_CAPABILITIES[component.kind]!;
    const yes = (b: boolean): string => (b ? "yes" : "");
    lines.push(`| [\`<${name}>\`](/reference/elements/${slug(name)}) | ${yes(c.timed)} | ${yes(c.visual)} | ${yes(c.audio)} | ${yes(c.trimSource)} | ${yes(c.transformable)} | ${c.childKinds.map((k) => `\`${k}\``).join(", ")} |`);
  }
  return lines.join("\n") + "\n";
}

function elementPage(name: string, summary: string): string {
  const component = { ...ELEMENTS, ...ENGINE_LAYERS }[name as keyof typeof ELEMENTS];
  let schema = z.toJSONSchema(component.schema as z.ZodType, { unrepresentable: "any", io: "input" }) as JsonSchema;
  const lines = [`# \`<${name}>\``, "", summary, ""];
  const ex = exampleFor(name);
  if (ex) lines.push(`<Example src="previews/elements/${ex}" alt="${attr(`<${name}>`)}">`, "", `<<< @/../examples/showcase/docs/${ex}.tsx`, "", "</Example>", "");
  else if (CODE_ONLY[name]) lines.push("```tsx", CODE_ONLY[name], "```", "", "The player draws it once the host calls `installFreeCodeLibraries()` ([Free code](/guide/free-code#three-js-and-motion)). The Node export leaves it out with a warning for now.", "");
  if (name === "Graphic") {
    // One schema per kind: show the props every graphic takes; the kinds' own are on the graphics pages.
    const own = new Set(GRAPHIC_KIND_NAMES.flatMap((k) => Object.keys(GRAPHIC_KINDS[k].shape)));
    const first = (schema.oneOf ?? schema.anyOf ?? [])[0] ?? {};
    const properties = Object.fromEntries(Object.entries(first.properties ?? {}).filter(([k]) => !own.has(k)));
    schema = { ...first, properties: { ...properties, kind: { enum: [...GRAPHIC_KIND_NAMES] } } };
  }
  const c = KIND_CAPABILITIES[component.kind]!;
  const traits = [c.timed && "timed", c.visual && "visual", c.audio && "audible", c.trimSource && "trims its source", c.transformable && "transformable"].filter(Boolean);
  lines.push("## Props", "");
  if (name === "Graphic") lines.push("Plus the props of its `kind`: see [Graphics](/reference/graphics/).", "");
  lines.push("| prop | type | default | required |", "|---|---|---|---|");
  const required = new Set(schema.required ?? []);
  for (const [prop, s] of Object.entries(schema.properties ?? {})) {
    const def = s.default === undefined ? "" : `\`${JSON.stringify(s.default)}\``;
    lines.push(`| \`${prop}\` | ${typeOf(s, 6)} | ${def} | ${required.has(prop) ? "yes" : ""} |`);
  }
  lines.push("", `${traits.length ? `${capital(traits.join(", "))}. ` : ""}${c.childKinds.length ? `Children: ${c.childKinds.map((k) => `\`${k}\``).join(", ")}.` : "No children."} [All elements](/reference/elements/)`, "");
  return lines.join("\n");
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
    "Every kind also takes the [`<Graphic>` props](/reference/elements/graphic): timing, `transform`, `enter`/`exit`, `style`, and `width`/`height` for its box. Colours and fonts default to theme tokens.", "",
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
  lines.push("", `Plus the [\`<Graphic>\` props](/reference/elements/graphic) every kind takes. More in [${capital(kind.category)}](/reference/graphics/#${kind.category.replace(/ /g, "-")}).`, "");
  return lines.join("\n");
}

function actionsPage(): string {
  // Notes that compare with another editor are for contributors (the kit's parity table), not for this page.
  const notes = new Map(OURS_ONLY.filter(([, note]) => !/openreel/i.test(note)).map(([type, note]) => [type, note] as const));
  const groups = new Map<string, string[]>();
  for (const type of listHandlers()) {
    const ns = type.split("/")[0]!;
    groups.set(ns, [...(groups.get(ns) ?? []), type]);
  }
  const lines = ["# Actions", "", `Generated from the registered handlers (${listHandlers().length}). Do not edit by hand; run \`pnpm docs:gen\`.`, "", "Every action has `validate`, `apply`, `invert` and `fold`; the inverse is never null. Params are typed in `packages/kit/src/actions/types/index.ts`.", ""];
  for (const [ns, types] of [...groups].sort()) {
    lines.push(`## \`${ns}/\``, "", "| action | note |", "|---|---|");
    for (const type of [...types].sort()) lines.push(`| \`${type}\` | ${notes.get(type) ?? ""} |`);
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
    if (/^<\/?(Example|Preview|PreviewCard|div)[\s>]/.test(line) || line.startsWith("<<< ")) return line;
    // Outside code: `<Tag` would be a Vue component and `{{ x }}` a Vue interpolation.
    return line.split("`").map((part, i) => (i % 2 === 1 ? part : part.replace(/<(?=[A-Za-z/])/g, "&lt;").replace(/\{\{/g, "&#123;&#123;"))).join("`");
  }).join("\n");
}

rmSync(join(out, "elements.md"), { force: true });
rmSync(join(out, "elements"), { recursive: true, force: true });
mkdirSync(join(out, "elements"));
writeFileSync(join(out, "elements", "index.md"), escapeTags(elementsIndex()));
const documented = Object.values(ELEMENT_DOCS).flat();
const missing = Object.keys(ELEMENTS).filter((name) => !documented.some(([e]) => e === name));
if (missing.length) throw new Error(`no summary in ELEMENT_DOCS for ${missing.join(", ")}`);
for (const [name, summary] of documented) writeFileSync(join(out, "elements", `${slug(name)}.md`), escapeTags(elementPage(name, summary)));
writeFileSync(join(out, "actions.md"), escapeTags(actionsPage()));
rmSync(join(out, "graphics"), { recursive: true, force: true });
mkdirSync(join(out, "graphics"));
writeFileSync(join(out, "graphics", "index.md"), escapeTags(graphicsIndex()));
for (const name of GRAPHIC_KIND_NAMES) writeFileSync(join(out, "graphics", `${name}.md`), escapeTags(graphicPage(name)));
// The sidebars of the generated sections, read by the site's config.
const sidebar = {
  elements: Object.entries(ELEMENT_DOCS).map(([group, items]) => ({ text: group, items: items.map(([name]) => ({ text: name, link: `/reference/elements/${slug(name)}` })) })),
  graphics: [...graphicCategories()].map(([category, names]) => ({ text: capital(category), items: names.map((name) => ({ text: GRAPHIC_KINDS[name].title, link: `/reference/graphics/${name}` })) })),
};
writeFileSync(join(root, "docs", ".vitepress", "sidebar.generated.json"), `${JSON.stringify(sidebar, null, 2)}\n`);
writeFileSync(join(out, "rendering.md"), escapeTags(renderingPage()));
console.log(`docs/reference: actions.md rendering.md, elements/ (${documented.length + 1} pages), graphics/ (${GRAPHIC_KIND_NAMES.length + 1} pages)`);
