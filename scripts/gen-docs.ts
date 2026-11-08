import { execFileSync } from "node:child_process";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join, relative, sep } from "node:path";

import { z } from "zod";

import { GRAPHIC_KIND_NAMES, GRAPHIC_KINDS, type GraphicKindName } from "../packages/graphics/src/index";
import {
  EFFECT_FAMILIES,
  EFFECTS,
  ELEMENTS,
  ENGINE_LAYERS,
  KIND_CAPABILITIES,
  listHandlers,
  MASK_NOT_RENDERED,
  MASKED_KINDS,
  NOT_RENDERED,
  RENDERED_VALUES,
  TRANSITION_FAMILIES,
  TRANSITIONS,
} from "../packages/kit/src/index";
import { EFFECT_DEMOS, effectExample, TRANSITION_TEXT, transitionExample } from "./effect-example";
import { syncGeneratedFiles } from "./generated-files";
import { graphicExample } from "./graphic-example";

/**
 * Generated reference pages: the element table from the Zod schemas and the
 * capabilities table, the action list from the registered handlers, and what renders from `rendering.ts` (the backend copies that
 * page into the agent's SKILL.md). Committed; CI fails when they drift from
 * the code.
 */
const root = join(import.meta.dirname, "..");
const out = join(root, "docs", "reference");
const check = process.argv.includes("--check");
if (process.argv.slice(2).some((arg) => arg !== "--check")) throw new Error("Usage: gen-docs.ts [--check]");
const generated = new Map<string, string>();
const write = (path: string, content: string) => generated.set(relative(root, path).split(sep).join("/"), content);

type JsonSchema = {
  type?: string | string[];
  enum?: unknown[];
  const?: unknown;
  anyOf?: JsonSchema[];
  oneOf?: JsonSchema[];
  items?: JsonSchema;
  /** A tuple's members, in order. */
  prefixItems?: JsonSchema[];
  properties?: Record<string, JsonSchema>;
  required?: string[];
  default?: unknown;
  description?: string;
  minimum?: number;
  maximum?: number;
};

/** A prop's type for a table; `limit` cuts a long list of values short, saying how many more. */
function typeOf(s: JsonSchema, limit = Infinity): string {
  if (s.enum)
    return s.enum.length > limit
      ? `${s.enum
          .slice(0, limit - 1)
          .map((v) => JSON.stringify(v))
          .join(" \\| ")} \\| … ${s.enum.length - limit + 1} more`
      : s.enum.map((v) => JSON.stringify(v)).join(" \\| ");
  if (s.const !== undefined) return JSON.stringify(s.const);
  const alts = s.anyOf ?? s.oneOf;
  if (alts) return [...new Set(alts.map((a) => typeOf(a, limit)))].join(" \\| ");
  if (s.type === "array" && s.prefixItems) return `[${s.prefixItems.map((m) => typeOf(m)).join(", ")}]`;
  if (s.type === "array") return `${s.items ? typeOf(s.items) : "unknown"}[]`;
  if (s.type === "object") return s.properties ? `{ ${Object.keys(s.properties).join(", ")} }` : "object";
  if (Array.isArray(s.type)) return s.type.join(" \\| ");
  if (s.type === "number" || s.type === "integer") {
    // `z.int()` bounds every integer by the safe range: that says nothing, so it reads as no bound.
    const min = s.minimum === undefined || s.minimum <= Number.MIN_SAFE_INTEGER ? undefined : s.minimum;
    const max = s.maximum === undefined || s.maximum >= Number.MAX_SAFE_INTEGER ? undefined : s.maximum;
    if (min !== undefined || max !== undefined) return `${s.type} (${min ?? "−∞"}..${max ?? "∞"})`;
  }
  return s.type ?? "any";
}

/** A default for a table: numbers kept to four significant digits, so 1/360 reads 0.002778. */
function defaultOf(value: unknown): string {
  if (value === undefined) return "";
  const rounded = JSON.stringify(value, (_, v: unknown) =>
    typeof v === "number" && !Number.isInteger(v) ? Number(v.toPrecision(4)) : v,
  );
  return `\`${rounded}\``;
}

/** What each element is for, by group: the index's cards and the first line of each page. */
const ELEMENT_DOCS: Record<string, readonly (readonly [element: string, summary: string])[]> = {
  Timeline: [
    ["Composition", "The video: frame rate, size, background and theme. It ends where its content ends."],
    [
      "Track",
      'A row of elements. A sequence track plays its children back to back; a free track (`layout="free"`) places each at its own start.',
    ],
    [
      "Clip",
      "A stretch of a video or image asset, trimmed by seconds, transcript words or camera shots, with speed, fit and transform.",
    ],
    ["Gap", "Empty time between clips on a sequence track."],
    ["Transition", "A blend between the two clips it sits between on a sequence track."],
    ["Marker", "A named point on the timeline."],
  ],
  "Free code": [
    [
      "Layer",
      "Free code in the frame: any React, CSS, canvas or WebGL, placed on the timeline like any overlay; `useT()` is its time.",
    ],
    [
      "Three",
      "A three.js scene on the timeline: plain three.js in `setup`, or React Three Fiber children, on the video's clock.",
    ],
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
    [
      "Effect",
      "A look on its parent: colour grading, blur, glow, outline, keying, corner pin, vignette, grain and more, or your own shader.",
    ],
    ["Adjustment", "Filters everything beneath it for its own stretch of time."],
    ["Mask", "Shows only a shape of its clip, with a feathered edge or inverted."],
  ],
  "Motion and time": [
    ["Keyframe", "Animates one property of its parent between values, with easing."],
    ["SpeedKey", "Changes its clip's speed from a moment on, eased: speed ramps."],
    ["Freeze", "Holds one frame of its clip for a while, then plays on."],
  ],
  Structure: [
    ["Nested", "A sequence written once as a component and placed like a clip."],
    ["Multicam", "Several camera angles of one take; `<Cut>`s pick which one shows."],
    ["Angle", "One camera of a `<Multicam>`: its asset and sync offset."],
    ["Cut", "Switches a `<Multicam>` to an angle at a moment."],
  ],
  Sound: [["Audio", "A stretch of a sound asset: volume, fades, ducking under another track, automation."]],
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

/** The complete files readers can learn from, and where each is shown: the showcase videos, the walkthrough, the recipes. */
const SHOWCASE_SECTIONS: Record<string, [string, string]> = {
  launch: ["Product launch", "/examples#a-product-launch"],
  kinetic: ["Kinetic type", "/examples#kinetic-type"],
  data: ["Data story", "/examples#a-data-story"],
  logo: ["Logo reveal", "/examples#a-logo-reveal"],
  edit: ["An edit", "/examples#an-edit"],
  captions: ["Captions and key points", "/examples#captions-and-key-points"],
};
const LEARNING_FILES: readonly { readonly title: string; readonly link: string; readonly text: string }[] = [
  ...Object.entries(SHOWCASE_SECTIONS).map(([file, [title, link]]) => ({
    title,
    link,
    text: readFileSync(join(root, "examples", "showcase", `${file}.tsx`), "utf8"),
  })),
  {
    title: "the walkthrough",
    link: "/guide/writing-files",
    text: readFileSync(join(root, "examples", "launch-recap", "video.tsx"), "utf8"),
  },
  ...readdirSync(join(root, "recipes"))
    .filter((f) => f.endsWith(".tsx"))
    .sort()
    .map((f) => {
      const text = readFileSync(join(root, "recipes", f), "utf8");
      const title = /^# (.+)$/m.exec(
        readFileSync(join(root, "docs", "recipes", f.replace(/\.tsx$/, ".md")), "utf8"),
      )?.[1];
      return { title: title ?? f, link: `/recipes/${f.replace(/\.tsx$/, "")}`, text };
    }),
];

/** "Used in" links for an element: every learning file that writes its tag. */
function usedIn(name: string): string | null {
  const tag = new RegExp(`<${name}[\\s>/]`);
  const hits = LEARNING_FILES.filter((f) => tag.test(f.text)).map((f) => `[${f.title}](${f.link})`);
  return hits.length > 0 ? `**Used in:** ${hits.join(" · ")}` : null;
}

const ENGINE_NOTE =
  "The player draws it once the host calls `installFreeCodeLibraries()` ([Free code](/guide/free-code#three-js-and-motion)); the export draws it the same way, in headless Chrome ([Exporting](/guide/exporting)).";

function elementsIndex(): string {
  const lines = [
    "# Elements",
    "",
    "The elements a file is written in: the timeline (clips, tracks, transitions, captions), free code, and ready-made titles, graphics and effects. Each page shows an example as the export renders it, with the file that made it, then the element's props. Generated from the Zod schemas in `packages/kit/src/jsx/schemas`; run `pnpm docs:gen`, and `pnpm docs:examples` for the videos.",
    "",
  ];
  for (const [group, items] of Object.entries(ELEMENT_DOCS)) {
    lines.push(`## ${group}`, "", '<div class="cc-cards">');
    for (const [name, summary] of items) {
      const ex = exampleFor(name);
      lines.push(
        `<PreviewCard code title="<${name}>" link="/reference/elements/${slug(name)}"${ex ? ` src="previews/elements/${ex}"` : ""} text="${attr(summary)}" />`,
      );
    }
    lines.push("</div>", "");
  }
  lines.push(
    "## Capabilities",
    "",
    "| element | timed | visual | audio | trims source | transformable | children allowed |",
    "|---|---|---|---|---|---|---|",
  );
  for (const [name, component] of Object.entries(ELEMENTS)) {
    const c = KIND_CAPABILITIES[component.kind]!;
    const yes = (b: boolean): string => (b ? "yes" : "");
    lines.push(
      `| [\`<${name}>\`](/reference/elements/${slug(name)}) | ${yes(c.timed)} | ${yes(c.visual)} | ${yes(c.audio)} | ${yes(c.trimSource)} | ${yes(c.transformable)} | ${c.childKinds.map((k) => `\`${k}\``).join(", ")} |`,
    );
  }
  return `${lines.join("\n")}\n`;
}

function elementPage(name: string, summary: string): string {
  const component = { ...ELEMENTS, ...ENGINE_LAYERS }[name as keyof typeof ELEMENTS];
  let schema = z.toJSONSchema(component.schema as z.ZodType, { unrepresentable: "any", io: "input" }) as JsonSchema;
  const lines = [`# \`<${name}>\``, "", ...(name === "Graphic" ? GRAPHIC_DEPRECATED : []), summary, ""];
  const ex = exampleFor(name);
  if (ex)
    lines.push(
      `<Example src="previews/elements/${ex}" alt="${attr(`<${name}>`)}">`,
      "",
      `<<< @/../examples/showcase/docs/${ex}.tsx`,
      "",
      "</Example>",
      "",
    );
  else if (CODE_ONLY[name]) lines.push("```tsx", CODE_ONLY[name], "```", "");
  if (name in ENGINE_LAYERS) lines.push(ENGINE_NOTE, "");
  const used = usedIn(name);
  if (used) lines.push(used, "");
  if (name === "Graphic") {
    // One schema per kind: show the props every graphic takes; the kinds' own are on the graphics pages.
    const own = new Set(GRAPHIC_KIND_NAMES.flatMap((k) => Object.keys(GRAPHIC_KINDS[k].shape)));
    const first = (schema.oneOf ?? schema.anyOf ?? [])[0] ?? {};
    const properties = Object.fromEntries(Object.entries(first.properties ?? {}).filter(([k]) => !own.has(k)));
    schema = { ...first, properties: { ...properties, kind: { enum: [...GRAPHIC_KIND_NAMES] } } };
  }
  const c = KIND_CAPABILITIES[component.kind]!;
  const traits = [
    c.timed && "timed",
    c.visual && "visual",
    c.audio && "audible",
    c.trimSource && "trims its source",
    c.transformable && "transformable",
  ].filter(Boolean);
  lines.push("## Props", "");
  if (name === "Graphic") lines.push("Plus the props of its `kind`: see [Graphics](/reference/graphics/).", "");
  lines.push("| prop | type | default | required |", "|---|---|---|---|");
  const required = new Set(schema.required ?? []);
  for (const [prop, s] of Object.entries(schema.properties ?? {})) {
    const def = defaultOf(s.default);
    lines.push(`| \`${prop}\` | ${typeOf(s, 6)} | ${def} | ${required.has(prop) ? "yes" : ""} |`);
  }
  if (name === "Effect" || name === "Transition")
    lines.push("", "Every built-in type and its params: [Effects and transitions](/reference/effects/).");
  lines.push(
    "",
    `${traits.length ? `${capital(traits.join(", "))}. ` : ""}${c.childKinds.length ? `Children: ${c.childKinds.map((k) => `\`${k}\``).join(", ")}.` : "No children."} [All elements](/reference/elements/)`,
    "",
  );
  return lines.join("\n");
}

/** How a built-in effect or transition draws, for its line in the reference. */
const DRAWN: Record<string, string> = {
  css: "a CSS filter; no WebGL needed",
  shader: "a shader",
  post: "painting on the element's pixels; no WebGL needed",
  look: "drawn without a shader",
};

/** One effect's or transition's params as a table, from its schema. */
function paramsTable(schema: z.ZodType): string[] {
  const json = z.toJSONSchema(schema, { unrepresentable: "any", io: "input" }) as JsonSchema;
  const props = Object.entries(json.properties ?? {});
  if (props.length === 0) return ["No params.", ""];
  return [
    "| param | type | default |",
    "|---|---|---|",
    ...props.map(([name, p]) => `| \`${name}\` | ${typeOf(p, 6)} | ${defaultOf(p.default)} |`),
    "",
  ];
}

/** The footage a demo shows that is not ours, credited under it. */
const STOCK_CREDIT =
  "The coffee footage is [Pixabay video 209419](https://pixabay.com/videos/id-209419/), under the Pixabay Content License.";

/** Every built-in effect and transition as a gallery, grouped by family: generated from the registry. */
function effectsIndex(): string {
  const lines = [
    "# Effects and transitions",
    "",
    "Every built-in `<Effect type>` and `<Transition type>`. Hover a card to play it; each page shows the file that made the video and the params it takes. Params outside their ranges, or not listed, are an error when the file resolves; a keyframe inside an effect animates one by `param`. Generated from the effect registry (`packages/kit/src/effects/registry.ts`) by `pnpm docs:gen`.",
    "",
    "## Effects",
    "",
  ];
  for (const [family, names] of Object.entries(EFFECT_FAMILIES)) {
    lines.push(`### ${family}`, "", '<div class="cc-cards">');
    for (const name of names)
      lines.push(
        `<PreviewCard code hover title="${name}" link="/reference/effects/${name}" src="previews/effects/${name}" text="${attr(EFFECT_DEMOS[name].text)}" />`,
      );
    lines.push("</div>", "");
  }
  lines.push("## Transitions", "");
  for (const [family, names] of Object.entries(TRANSITION_FAMILIES)) {
    lines.push(`### ${family}`, "", '<div class="cc-cards">');
    for (const name of names)
      lines.push(
        `<PreviewCard code hover title="${name}" link="/reference/transitions/${name}" src="previews/transitions/${name}" text="${attr(TRANSITION_TEXT[name])}" />`,
      );
    lines.push("</div>", "");
  }
  lines.push(
    "## Units",
    "",
    "A param's name says what kind of value it is, and each kind has one scale:",
    "",
    "| Kind | Scale | Params |",
    "|---|---|---|",
    "| strength, mix or share | a fraction, 0 to 1, or -1 to 1 when it goes both ways | `amount`, `opacity`, `softness`, `tolerance`, `tint`, `temperature`, `shadows`, `highlights`, `threshold`, `spill`, `black`, `white`, `blur`, `roundness`, `star` |",
    "| gain | a multiplier | `intensity`, `scale` |",
    "| exponent | a power, 1 changes nothing | `gamma` |",
    "| distance | pixels of the composition; a blur's `radius` (and `bevel`'s `size`) is its Gaussian's standard deviation, as CSS `blur()` reads it | `radius`, `width`, `feather`, `length`, `distance`, `size`, `edge`, `x`, `y` |",
    "| angle | degrees, clockwise from up | `angle`, `rotation`, `startAngle` |",
    "| position | fractions of the frame, `[x, y]` from the top left | `center`, `box`, the corners |",
    '| colour | `"#rgb"` or `"#rrggbb"` | `color`, `dark`, `light` |',
    "| exposure | stops | `stops` |",
    "| duration | seconds | `holdDuration` |",
    "| count | a whole number | `sides`, `slats`, `columns`, `rows`, `samples` |",
    "| seed | a whole number; the same seed draws the same pattern | `seed` |",
    "| switch | `true` or `false` | `fade`, `inverted`, `outlineOnly`, `pushOut`, `radial` |",
    "| curve | `[input, output]` points, 0 to 1 | `rgb`, `red`, `green`, `blue` |",
    '| asset | `"asset:<id>"` from the manifest | `src` |',
    "| choice | a string | `direction`, `curve` |",
    "",
  );
  // Links to the single page this replaced (`/reference/effects#iris`) go on to the item's own page.
  const pages = Object.fromEntries([
    ...Object.keys(EFFECTS).map((n) => [n.toLowerCase(), `effects/${n}`]),
    ...Object.keys(TRANSITIONS).map((n) => [n.toLowerCase(), `transitions/${n}`]),
  ]);
  lines.push(
    "<script setup>",
    'import { onMounted } from "vue";',
    'import { withBase } from "vitepress";',
    `const PAGES = ${JSON.stringify(pages)};`,
    "onMounted(() => {",
    "  const page = PAGES[location.hash.slice(1).toLowerCase()];",
    "  if (page) location.replace(withBase(`/reference/${page}`));",
    "});",
    "</script>",
    "",
  );
  return lines.join("\n");
}

/** One built-in effect's page: its demo above the file that made it, then how it draws and its params. */
function effectPage(name: keyof typeof EFFECTS): string {
  const e = EFFECTS[name];
  const demo = EFFECT_DEMOS[name];
  const fallback = e.draw.kind === "shader" && e.draw.css ? ", with a CSS filter where WebGL is missing" : "";
  return [
    `# \`${name}\``,
    "",
    demo.text,
    "",
    `<Example src="previews/effects/${name}" alt="${name}">`,
    "",
    `<<< @/../examples/showcase/effects/${name}.tsx`,
    "",
    "</Example>",
    "",
    ...(effectExample(name).includes("asset:coffee") ? [STOCK_CREDIT, ""] : []),
    "## Params",
    "",
    `Drawn as ${DRAWN[e.draw.kind]}${fallback}.`,
    "",
    ...paramsTable(e.params),
    "[All effects and transitions](/reference/effects/) · [Units](/reference/effects/#units)",
    "",
  ].join("\n");
}

/** One built-in transition's page, as an effect's. */
function transitionPage(name: keyof typeof TRANSITIONS): string {
  const t = TRANSITIONS[name];
  const fallback = t.draw.kind === "shader" ? ", as a crossfade where WebGL is missing" : "";
  return [
    `# \`${name}\``,
    "",
    TRANSITION_TEXT[name],
    "",
    `<Example src="previews/transitions/${name}" alt="${name}">`,
    "",
    `<<< @/../examples/showcase/transitions/${name}.tsx`,
    "",
    "</Example>",
    "",
    STOCK_CREDIT,
    "",
    "## Params",
    "",
    `Drawn ${t.draw.kind === "shader" ? "by a shader" : "without a shader"}${fallback}.`,
    "",
    ...paramsTable(t.params),
    "[All effects and transitions](/reference/effects/) · [Units](/reference/effects/#units)",
    "",
  ].join("\n");
}

/** A generated example file, formatted as the repository formats its code, so the formatter leaves it alone. */
function formatted(path: string, code: string): string {
  return execFileSync(join(root, "node_modules", ".bin", "biome"), ["format", `--stdin-file-path=${path}`], {
    input: code,
    encoding: "utf8",
  });
}

/** A Vue attribute value: quotes and braces escaped, Markdown code ticks dropped. */
const attr = (text: string): string =>
  text.replace(/`/g, "").replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/\{\{/g, "&#123;&#123;");
/** The first sentence, for a card. */
const firstSentence = (text: string): string => /^.*?[.;](?=\s|$)/.exec(text)?.[0].replace(/;$/, ".") ?? text;
const capital = (s: string): string => `${s[0]!.toUpperCase()}${s.slice(1)}`;

function graphicCategories(): Map<string, string[]> {
  const categories = new Map<string, string[]>();
  for (const name of GRAPHIC_KIND_NAMES)
    categories.set(GRAPHIC_KINDS[name].category, [...(categories.get(GRAPHIC_KINDS[name].category) ?? []), name]);
  return categories;
}

/** A rendered example: the video, then the code that made it (both from `graphicExample`). */
const example = (src: string, alt: string, code: string): string[] => [
  `<Example src="${src}" alt="${attr(alt)}">`,
  "",
  "```tsx",
  code,
  "```",
  "",
  "</Example>",
];

/** At the top of every page about `<Graphic>` and its kinds, until they are removed (decision 0020). */
const GRAPHIC_DEPRECATED = [
  "::: warning Deprecated",
  "`<Graphic>` and its kinds are deprecated and will be removed in a later release; the lint warns on each one. Draw the same thing with `<Motion>`, `<Three>` or a `<Layer>`: the [examples](/examples) show each, and [Free code](/guide/free-code) explains them.",
  ":::",
  "",
];

function graphicsIndex(): string {
  const lines = [
    "# Graphics",
    "",
    ...GRAPHIC_DEPRECATED,
    "Built-in kinds of `<Graphic>`: pure functions from props and the theme to SVG, drawn the same in the preview and the export. Each card plays its example as the export renders it; its page has the code. Generated from `packages/graphics` by `pnpm docs:gen`; the previews were rendered by the Node export, which is gone, and `<Graphic>` is deprecated, so they are not rendered again.",
    "",
    ...example("previews/graphics/lower-third", "A lower third", graphicExample("lower-third").code),
    "",
    "Every kind also takes the [`<Graphic>` props](/reference/elements/graphic): timing, `transform`, `enter`/`exit`, `style`, and `width`/`height` for its box. Colours and fonts default to theme tokens.",
    "",
  ];
  for (const [category, names] of graphicCategories()) {
    lines.push(`## ${capital(category)}`, "", '<div class="cc-cards">');
    for (const name of names)
      lines.push(
        `<PreviewCard code title="${name}" link="/reference/graphics/${name}" src="previews/graphics/${name}" text="${attr(firstSentence(GRAPHIC_KINDS[name].description))}" />`,
      );
    lines.push("</div>", "");
  }
  return lines.join("\n");
}

function graphicPage(name: GraphicKindName): string {
  const kind = GRAPHIC_KINDS[name];
  const schema = z.toJSONSchema(z.strictObject(kind.shape), { unrepresentable: "any", io: "input" }) as JsonSchema;
  const lines = [
    `# ${kind.title}`,
    "",
    ...GRAPHIC_DEPRECATED,
    `${kind.description}${kind.animated ? " Animated: it changes over its whole duration." : ""}`,
    "",
    ...example(`previews/graphics/${name}`, kind.title, graphicExample(name).code),
    "",
    "## Props",
    "",
    "| prop | type | default |",
    "|---|---|---|",
  ];
  for (const [prop, ps] of Object.entries(schema.properties ?? {}))
    lines.push(`| \`${prop}\` | ${typeOf(ps)} | ${defaultOf(ps.default)} |`);
  lines.push(
    "",
    `Plus the [\`<Graphic>\` props](/reference/elements/graphic) every kind takes. More in [${capital(kind.category)}](/reference/graphics/#${kind.category.replace(/ /g, "-")}).`,
    "",
  );
  return lines.join("\n");
}

/** A line on the actions page for the actions whose name does not say it all. */
const ACTION_NOTES: Readonly<Record<string, string>> = {
  "batch/apply": "one history entry for multi-action gestures and compound inverses",
  "composition/setProps": "the tweaks panel: rewrites the file's `defaults` literal",
  "composition/setTheme": "the file's theme: swap it, extend it or remove it in one step",
  "theme/setToken": "one palette colour, font role or radius in the file's theme",
  "graphic/create": "a built-in graphic kind (`<Graphic>`)",
  "graphic/update": "a built-in graphic kind (`<Graphic>`)",
  "graphic/remove": "a built-in graphic kind (`<Graphic>`)",
  "clip/setSource": "media-slot replacement",
  "keyframe/restore": "undo of keyframe/remove keeps its easing",
  "caption/setAnimation": "caption animation style as its own action",
  "multicam/restoreCut": "undo of removeCut",
  "multicam/remove": "a multicam group is an element and can be deleted",
  "mask/restore": "undo of mask/remove",
  "multicam/setActiveAngle": "angle selection",
  "layer/setTiming": "the <Layer> escape hatch",
  "layer/setTransform": "the <Layer> escape hatch",
  "layer/setProps": "the handles of a Layer's component",
  "source/bake": "expand generated elements into literals",
  "source/setProp": "generic inspector write",
  "source/setProps": "the inverse of every prop-writing action",
  "track/setLayout": "sequence ↔ free",
};

function actionsPage(): string {
  const notes = new Map(Object.entries(ACTION_NOTES));
  const groups = new Map<string, string[]>();
  for (const type of listHandlers()) {
    const ns = type.split("/")[0]!;
    groups.set(ns, [...(groups.get(ns) ?? []), type]);
  }
  const lines = [
    "# Actions",
    "",
    `Generated from the registered handlers (${listHandlers().length}). Do not edit by hand; run \`pnpm docs:gen\`.`,
    "",
    "Every action has `validate`, `apply`, `invert` and `fold`; the inverse is never null. Params are typed in `packages/kit/src/actions/types/index.ts`.",
    "",
  ];
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
  const on = (kinds: string[]): string =>
    kinds.map((k) => (k === "*" ? "any element" : (names.get(k) ?? k))).join(", ");
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
    "# What renders",
    "",
    "What the player and the export draw, out of what the schemas accept. Generated from `packages/kit/src/jsx/rendering.ts` by `pnpm docs:gen`; do not edit by hand.",
    "",
    "The check's `not-rendered` warning reports everything outside these lists, so a file that checks clean renders as written.",
    "",
    "## Values that render",
    "",
  ];
  for (const [r, kinds] of merge(RENDERED_VALUES, (r) => `${r.prop}|${r.values.join()}|${r.reason}`)) {
    const only = r.values.length
      ? `only ${r.values.map(code).join(", ")} render${r.values.length === 1 ? "s" : ""}; any other value`
      : "no value renders; any value";
    lines.push(`- ${code(r.prop)} on ${on(kinds)}: ${only} ${why(r.reason)}.`);
  }
  lines.push(
    `- A \`<Mask>\` on an element other than ${on([...MASKED_KINDS])} ${why(MASK_NOT_RENDERED.kind)}; a second \`<Mask>\` ${why(MASK_NOT_RENDERED.second)}.`,
  );
  lines.push(
    "",
    "## Accepted but not rendered",
    "",
    'No value means any value except one that asks for nothing (`false`, `0`, `"none"`, `"all"`).',
    "",
    "| element | prop | value | what happens |",
    "|---|---|---|---|",
  );
  for (const [r, kinds] of merge(NOT_RENDERED, (r) => `${r.prop}|${r.value}|${r.reason}`)) {
    lines.push(
      `| ${on(kinds)} | ${r.prop ? code(r.prop) : "the element"} | ${r.value ? code(r.value) : ""} | ${why(r.reason)} |`,
    );
  }
  return `${lines.join("\n")}\n`;
}

/** VitePress compiles markdown as Vue, so a bare `<Layer>` or `{{ … }}` in prose must be escaped; code spans and fences are left alone. */
function escapeTags(markdown: string): string {
  let fenced = false;
  return markdown
    .split("\n")
    .map((line) => {
      if (line.trimStart().startsWith("```")) {
        fenced = !fenced;
        return line;
      }
      if (fenced) return line;
      // Our own components and their grid are written on lines of their own, as they are.
      if (/^<\/?(Example|Preview|PreviewCard|div|script)[\s>]/.test(line) || line.startsWith("<<< ")) return line;
      // Outside code: `<Tag` would be a Vue component and `{{ x }}` a Vue interpolation.
      return line
        .split("`")
        .map((part, i) =>
          i % 2 === 1 ? part : part.replace(/<(?=[A-Za-z/])/g, "&lt;").replace(/\{\{/g, "&#123;&#123;"),
        )
        .join("`");
    })
    .join("\n");
}

write(join(out, "elements", "index.md"), escapeTags(elementsIndex()));
const documented = Object.values(ELEMENT_DOCS).flat();
const missing = Object.keys(ELEMENTS).filter((name) => !documented.some(([e]) => e === name));
if (missing.length) throw new Error(`no summary in ELEMENT_DOCS for ${missing.join(", ")}`);
for (const [name, summary] of documented)
  write(join(out, "elements", `${slug(name)}.md`), escapeTags(elementPage(name, summary)));
write(join(out, "actions.md"), escapeTags(actionsPage()));
write(join(out, "graphics", "index.md"), escapeTags(graphicsIndex()));
for (const name of GRAPHIC_KIND_NAMES) write(join(out, "graphics", `${name}.md`), escapeTags(graphicPage(name)));
// The sidebars of the generated sections, read by the site's config.
const sidebar = {
  elements: Object.entries(ELEMENT_DOCS).map(([group, items]) => ({
    text: group,
    items: items.map(([name]) => ({ text: name, link: `/reference/elements/${slug(name)}` })),
  })),
  effects: Object.entries(EFFECT_FAMILIES).map(([family, names]) => ({
    text: family,
    items: names.map((name) => ({ text: name, link: `/reference/effects/${name}` })),
  })),
  transitions: Object.entries(TRANSITION_FAMILIES).map(([family, names]) => ({
    text: family,
    items: names.map((name) => ({ text: name, link: `/reference/transitions/${name}` })),
  })),
  graphics: [...graphicCategories()].map(([category, names]) => ({
    text: capital(category),
    items: names.map((name) => ({ text: GRAPHIC_KINDS[name].title, link: `/reference/graphics/${name}` })),
  })),
};
write(join(root, "docs", ".vitepress", "sidebar.generated.json"), `${JSON.stringify(sidebar, null, 2)}\n`);
write(join(out, "rendering.md"), escapeTags(renderingPage()));
write(join(out, "effects", "index.md"), escapeTags(effectsIndex()));
for (const name of Object.keys(EFFECTS) as (keyof typeof EFFECTS)[]) {
  write(join(out, "effects", `${name}.md`), escapeTags(effectPage(name)));
  const file = join(root, "examples", "showcase", "effects", `${name}.tsx`);
  write(file, formatted(file, effectExample(name)));
}
for (const name of Object.keys(TRANSITIONS) as (keyof typeof TRANSITIONS)[]) {
  write(join(out, "transitions", `${name}.md`), escapeTags(transitionPage(name)));
  const file = join(root, "examples", "showcase", "transitions", `${name}.tsx`);
  write(file, formatted(file, transitionExample(name)));
}
const problems = syncGeneratedFiles(root, generated, {
  check,
  directories: [
    "docs/reference/elements",
    "docs/reference/graphics",
    "docs/reference/effects",
    "docs/reference/transitions",
    "examples/showcase/effects",
    "examples/showcase/transitions",
  ],
  obsolete: ["docs/reference/elements.md", "docs/reference/effects.md"],
});
if (problems.length) {
  console.error(`Generated reference is stale (${problems.length} files). Run pnpm docs:gen.`);
  for (const problem of problems) console.error(problem);
  process.exitCode = 1;
} else {
  console.log(`${check ? "Checked" : "Generated"} ${generated.size} reference/sidebar files.`);
}
