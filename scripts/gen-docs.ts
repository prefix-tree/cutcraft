import { execFileSync } from "node:child_process";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join, relative, sep } from "node:path";

import { z } from "zod";

import {
  COMPONENTS,
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
import { type BlockInfo, listBlocks } from "../packages/render/src/blocks";
import { EFFECT_DEMOS, effectExample, TRANSITION_TEXT, transitionExample } from "./effect-example";
import { syncGeneratedFiles } from "./generated-files";
import { readPropDocs } from "./prop-docs";

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
/** A generated page: its "Edit this page" link is off, as an edit to it is overwritten; the code it comes from is the place. */
const page = (markdown: string): string => `---\neditLink: false\n---\n\n${markdown}`;
const DOCS = readPropDocs();
/** Props and actions with no JSDoc: the check fails on them, so every row of a table says what it is. */
const undocumented: string[] = [];
/** A prop's description for a table cell, recorded as missing when there is none. */
function describe(table: string, prop: string): string {
  const doc = DOCS.props.get(table)?.get(prop);
  if (!doc) undocumented.push(`${table} ${prop}`);
  return cell(doc ?? "");
}
/** Text for a Markdown table cell: one line, with its backslashes and pipes escaped. */
const cell = (text: string): string =>
  text
    .replace(/\s*\n\s*/g, " ")
    .replace(/\\/g, "\\\\")
    .replace(/\|/g, "\\|");

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
  exclusiveMinimum?: number;
  exclusiveMaximum?: number;
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
    // `.positive()` is an exclusive bound: `> 0`.
    if (min === undefined && max === undefined && s.exclusiveMinimum !== undefined && s.exclusiveMaximum === undefined)
      return `${s.type} (> ${s.exclusiveMinimum})`;
    const low = min ?? (s.exclusiveMinimum === undefined ? undefined : `>${s.exclusiveMinimum}`);
    const high = max ?? (s.exclusiveMaximum === undefined ? undefined : `<${s.exclusiveMaximum}`);
    if (low !== undefined || high !== undefined) return `${s.type} (${low ?? "−∞"}..${high ?? "∞"})`;
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
    ["Title", "Text over the picture in the theme's type, with entrances by letter or by word."],
    ["Captions", "Subtitles from an asset's transcript that follow the clips through every trim."],
    ["Caption", "One cue inside `<Captions>`, written by hand: its text, start and end."],
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
  launch: ["Product launch", "/examples/launch"],
  kinetic: ["Kinetic type", "/examples/kinetic"],
  data: ["Data story", "/examples/data"],
  logo: ["Logo reveal", "/examples/logo"],
  edit: ["An edit", "/examples/edit"],
  captions: ["Captions and key points", "/examples/captions"],
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
    "The elements a file is written in: the timeline (clips, tracks, transitions, captions), free code, titles, shapes and effects. Each page shows an example as the export renders it, with the file that made it, then the element's props. Every element is built from the same parts (an id, its timing, where it sits, how it looks, its children): [Anatomy of an element](/guide/elements) explains them once. Generated from the Zod schemas in `packages/kit/src/jsx/schemas`; run `pnpm docs:gen`, and `pnpm docs:examples` for the videos.",
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
  const schema = z.toJSONSchema(component.schema as z.ZodType, { unrepresentable: "any", io: "input" }) as JsonSchema;
  const lines = [`# \`<${name}>\``, "", summary, ""];
  const ex = exampleFor(name);
  if (ex)
    lines.push(
      `<Example src="previews/elements/${ex}" alt="${attr(`<${name}>`)}">`,
      "",
      `<<< @/../examples/showcase/docs/${ex}.tsx`,
      "",
      "</Example>",
      "",
      ...(showsStock(readFileSync(join(root, "examples", "showcase", "docs", `${ex}.tsx`), "utf8"))
        ? [STOCK_CREDIT, ""]
        : []),
    );
  else if (CODE_ONLY[name]) lines.push("```tsx", CODE_ONLY[name], "```", "");
  if (name in ENGINE_LAYERS) lines.push(ENGINE_NOTE, "");
  const used = usedIn(name);
  if (used) lines.push(used, "");
  const c = KIND_CAPABILITIES[component.kind]!;
  const traits = [
    c.timed && "timed",
    c.visual && "visual",
    c.audio && "audible",
    c.trimSource && "trims its source",
    c.transformable && "transformable",
  ].filter(Boolean);
  lines.push("## Props", "");
  lines.push("| prop | type | default | required | description |", "|---|---|---|---|---|");
  const required = new Set(schema.required ?? []);
  for (const [prop, s] of Object.entries(schema.properties ?? {})) {
    const def = defaultOf(s.default);
    lines.push(
      `| \`${prop}\` | ${typeOf(s, 6)} | ${def} | ${required.has(prop) ? "yes" : ""} | ${describe(`element:${name}`, prop)} |`,
    );
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

/** One effect's, transition's or component's params as a table, from its schema; `table` names its JSDoc. */
function paramsTable(schema: z.ZodType, table: string): string[] {
  const json = z.toJSONSchema(schema, { unrepresentable: "any", io: "input" }) as JsonSchema;
  const props = Object.entries(json.properties ?? {});
  if (props.length === 0) return ["No params.", ""];
  return [
    "| param | type | default | description |",
    "|---|---|---|---|",
    ...props.map(
      ([name, p]) => `| \`${name}\` | ${typeOf(p, 6)} | ${defaultOf(p.default)} | ${describe(table, name)} |`,
    ),
    "",
  ];
}

/** The footage a demo shows that is not ours (four stock coffee clips and the shots cut from them), credited under it. */
const STOCK_CREDIT =
  "The coffee footage is Pixabay videos [209419](https://pixabay.com/videos/id-209419/), [209424](https://pixabay.com/videos/id-209424/), [46989](https://pixabay.com/videos/id-46989/) and [251](https://pixabay.com/videos/id-251/), under the Pixabay Content License. The maker of the machine in the red cup shot has nothing to do with this project.";

/** Whether a demo's file shows footage: one of the stock clips, or a shot the showcase cuts from them. */
const showsStock = (text: string): boolean =>
  /asset:(coffee|coffeeWide|espresso|redCup|founder|analyst|product|speaker|greenscreen)"/.test(text);

/** A component's page and file name: `LowerThird` is `lower-third`. */
const kebab = (name: string): string => name.replace(/([a-z])([A-Z])/g, "$1-$2").toLowerCase();

/** The ready-made components as a gallery: generated from the kit's `COMPONENTS`. */
function componentsIndex(): string {
  const lines = [
    "# Components",
    "",
    "Ready-made pieces: lower thirds, callouts, counters, cards and the like. Import them from `@uberscene/kit` and write them on a track like any element. Generated from `packages/kit/src/components` by `pnpm docs:gen`.",
    "",
    '<div class="cc-cards">',
  ];
  for (const [name, c] of Object.entries(COMPONENTS))
    lines.push(
      `<PreviewCard code hover title="${name}" link="/reference/components/${kebab(name)}" src="previews/components/${kebab(name)}" text="${attr(c.text)}" />`,
    );
  lines.push(
    "</div>",
    "",
    "## Anatomy of a component",
    "",
    "A component is an ordinary function that returns the kit's own elements: titles, shapes, SVG, and a layer where something moves every frame. So it behaves like the elements it is made of.",
    "",
    "```tsx",
    '<LowerThird id="name" start={0.5} duration={4} name="Maya Chen" role="Head roaster, Halvard" />',
    "```",
    "",
    "| Part | How it works |",
    "|---|---|",
    "| `id` | Names the component. Each element it makes has an id that starts with it: `name-card`, `name-bar`, `name-name`, `name-role`. |",
    "| Timing | The same props as any element: `start`, or `anchor` with `at` and `offset`, and `duration`, including `{ until: id }`. Its parts come in and go out inside that time. |",
    "| Position | `x` and `y` are pixels from the frame's centre, as every element's `transform.position`. The defaults suit a 1920x1080 frame. |",
    "| Look | Colours default to theme tokens (`$primary`, `$surface`, `$text`) and text to the theme's fonts, so a theme restyles every component. |",
    "| Its own props | The words and options it draws, listed on its page: `name` and `role` for a lower third, `to` and `format` for a counter. |",
    "| In an editor | Its props are editable in an inspector. Editing one of its parts writes that use out into the file as plain elements, and the edit applies to them. |",
    "",
    "Any function that returns elements works the same way, so you can write your own ([Helpers](/guide/the-file#helpers)). [Anatomy of an element](/guide/elements) covers the parts every element shares.",
    "",
  );
  return lines.join("\n");
}

/** One component's page: its demo above the file that made it, then its props. */
function componentPage(name: keyof typeof COMPONENTS): string {
  const c = COMPONENTS[name];
  const file = kebab(name);
  return [
    `# \`${name}\``,
    "",
    c.text,
    "",
    `<Example src="previews/components/${file}" alt="${name}">`,
    "",
    `<<< @/../examples/showcase/components/${file}.tsx`,
    "",
    "</Example>",
    "",
    ...(showsStock(readFileSync(join(root, "examples", "showcase", "components", `${file}.tsx`), "utf8"))
      ? [STOCK_CREDIT, ""]
      : []),
    "## Props",
    "",
    "Besides the timing props (`start`, `anchor`, `at`, `offset`, `duration`):",
    "",
    ...paramsTable(
      c.props.omit({ start: true, anchor: true, at: true, offset: true, duration: true }),
      `component:${name}`,
    ),
    "[All components](/reference/components/)",
    "",
  ].join("\n");
}

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
    "| strength, mix or share | a fraction, 0 to 1, or -1 to 1 when it goes both ways | `amount`, `opacity`, `softness`, `tolerance`, `tint`, `temperature`, `shadows`, `highlights`, `threshold`, `spill`, `black`, `white`, `blur`, `roundness`, `star`, `thickness`, `spread` (of the frame's diagonal) |",
    "| gain | a multiplier | `intensity`, `scale`, `contrast` |",
    "| exponent | a power, 1 changes nothing | `gamma` |",
    "| distance | pixels of the composition; a blur's `radius` (and `bevel`'s `size`) is its Gaussian's standard deviation, as CSS `blur()` reads it | `radius`, `width`, `feather`, `length`, `distance`, `size`, `spacing`, `edge`, `x`, `y` |",
    "| angle | degrees, clockwise from up | `angle`, `rotation`, `startAngle` |",
    "| position | fractions of the frame, `[x, y]` from the top left | `center`, `box`, the corners |",
    '| colour | `"#rgb"` or `"#rrggbb"` | `color`, `dark`, `light`, `ink`, `paper` |',
    "| exposure | stops | `stops` |",
    "| duration | seconds | `holdDuration` |",
    "| rate | per second: pixels for `speed`, changes of the pattern for `evolution` | `speed`, `evolution` |",
    "| count | a whole number | `sides`, `slats`, `columns`, `rows`, `samples`, `octaves` |",
    "| seed | a whole number; the same seed draws the same pattern | `seed` |",
    "| switch | `true` or `false` | `fade`, `inverted`, `outlineOnly`, `pushOut`, `radial` |",
    "| curve | `[input, output]` points, 0 to 1 | `rgb`, `red`, `green`, `blue` |",
    '| asset | `"asset:<id>"` from the manifest | `src` |',
    "| choice | a string | `direction`, `curve`, `mode`, `blend` |",
    "",
  );
  return lines.join("\n");
}

/**
 * The effects index's script: links to the single page it replaced (`/reference/effects#iris`) go on to the item's
 * own page. Appended after escaping, so `escapeTags` never has to let a script through.
 */
function redirectScript(): string {
  const pages = Object.fromEntries([
    ...Object.keys(EFFECTS).map((n) => [n.toLowerCase(), `effects/${n}`]),
    ...Object.keys(TRANSITIONS).map((n) => [n.toLowerCase(), `transitions/${n}`]),
  ]);
  return [
    "<script setup>",
    'import { onMounted } from "vue";',
    'import { withBase } from "vitepress";',
    `const PAGES = ${JSON.stringify(pages)};`,
    "onMounted(() => {",
    "  const page = PAGES[location.hash.slice(1).toLowerCase()];",
    '  if (page) location.replace(withBase("/reference/" + page));',
    "});",
    "</script>",
    "",
  ].join("\n");
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
    ...(showsStock(effectExample(name)) ? [STOCK_CREDIT, ""] : []),
    "## Params",
    "",
    `Drawn as ${DRAWN[e.draw.kind]}${fallback}.`,
    "",
    ...paramsTable(e.params, `effect:${name}`),
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
    ...paramsTable(t.params, `transition:${name}`),
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
const capital = (s: string): string => `${s[0]!.toUpperCase()}${s.slice(1)}`;

function actionsPage(): string {
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
    "Every action has `validate`, `apply`, `invert` and `fold`; the inverse is never null. Each runs as `{ type, params }`; the params and notes here are read from `packages/kit/src/actions/types/index.ts`.",
    "",
  ];
  for (const [ns, types] of [...groups].sort()) {
    lines.push(`## \`${ns}/\``, "", "| action | params | what it does |", "|---|---|---|");
    for (const type of [...types].sort()) {
      const doc = DOCS.actions.get(type);
      if (!doc?.note) undocumented.push(`action ${type}`);
      lines.push(`| \`${type}\` | \`${cell(doc?.params ?? "")}\` | ${cell(doc?.note ?? "")} |`);
    }
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
  // A row that holds only inside some parents names them: `<Effect>` inside `<Title>`, `<Shape>`.
  const free = NOT_RENDERED.filter((r) => !r.parent);
  const inside = NOT_RENDERED.filter((r) => r.parent).map((r) => ({ ...r, kind: r.parent!, child: r.kind }));
  const rows = [
    ...merge(free, (r) => `${r.prop}|${r.value}|${r.reason}`).map(([r, kinds]) => [r, on(kinds)] as const),
    ...merge(inside, (r) => `${r.child}|${r.prop}|${r.value}|${r.reason}`).map(
      ([r, parents]) => [r, `${on([r.child])} inside ${on(parents)}`] as const,
    ),
  ];
  for (const [r, element] of rows)
    lines.push(
      `| ${element} | ${r.prop ? code(r.prop) : "the element"} | ${r.value ? code(r.value) : ""} | ${why(r.reason)} |`,
    );
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
      if (/^<\/?(Example|Preview|PreviewCard|div)[\s>]/.test(line) || line.startsWith("<<< ")) return line;
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

write(join(out, "elements", "index.md"), page(escapeTags(elementsIndex())));
const documented = Object.values(ELEMENT_DOCS).flat();
const missing = Object.keys(ELEMENTS).filter((name) => !documented.some(([e]) => e === name));
if (missing.length) throw new Error(`no summary in ELEMENT_DOCS for ${missing.join(", ")}`);
for (const [name, summary] of documented)
  write(join(out, "elements", `${slug(name)}.md`), page(escapeTags(elementPage(name, summary))));
write(join(out, "actions.md"), page(escapeTags(actionsPage())));
// The sidebars of the generated sections, read by the site's config.
const sidebar = {
  elements: Object.entries(ELEMENT_DOCS).map(([group, items]) => ({
    text: group,
    items: items.map(([name]) => ({ text: name, link: `/reference/elements/${slug(name)}` })),
  })),
  components: Object.keys(COMPONENTS).map((name) => ({ text: name, link: `/reference/components/${kebab(name)}` })),
  effects: Object.entries(EFFECT_FAMILIES).map(([family, names]) => ({
    text: family,
    items: names.map((name) => ({ text: name, link: `/reference/effects/${name}` })),
  })),
  transitions: Object.entries(TRANSITION_FAMILIES).map(([family, names]) => ({
    text: family,
    items: names.map((name) => ({ text: name, link: `/reference/transitions/${name}` })),
  })),
};
write(join(root, "docs", ".vitepress", "sidebar.generated.json"), `${JSON.stringify(sidebar, null, 2)}\n`);
write(join(out, "rendering.md"), page(escapeTags(renderingPage())));
write(join(out, "effects", "index.md"), page(`${escapeTags(effectsIndex())}\n${redirectScript()}`));
write(join(out, "components", "index.md"), page(escapeTags(componentsIndex())));
for (const name of Object.keys(COMPONENTS) as (keyof typeof COMPONENTS)[])
  write(join(out, "components", `${kebab(name)}.md`), page(escapeTags(componentPage(name))));
for (const name of Object.keys(EFFECTS) as (keyof typeof EFFECTS)[]) {
  write(join(out, "effects", `${name}.md`), page(escapeTags(effectPage(name))));
  const file = join(root, "examples", "showcase", "effects", `${name}.tsx`);
  write(file, formatted(file, effectExample(name)));
}
for (const name of Object.keys(TRANSITIONS) as (keyof typeof TRANSITIONS)[]) {
  write(join(out, "transitions", `${name}.md`), page(escapeTags(transitionPage(name))));
  const file = join(root, "examples", "showcase", "transitions", `${name}.tsx`);
  write(file, formatted(file, transitionExample(name)));
}
// The agent skill's references: the same pages, for a model reading files. What only the site can show (the
// rendered examples, where an element is used) is left out, and the site's links become absolute.
const SITE = "https://uberscene.prefixtree.xyz";
const skillRefs = join(root, "plugins", "uberscene", "skills", "uberscene", "references");
function forAgent(page: string, demote = true): string {
  const text = page
    .replace(/\n<Example[^\n]*>\n[\s\S]*?\n<\/Example>\n/g, "\n")
    .split("\n")
    .filter((line) => !line.startsWith("**Used in:**") && !line.startsWith("The coffee footage is"))
    .join("\n")
    .replace(/\]\(\/(?!\/)/g, `](${SITE}/`);
  return (demote ? text.replace(/^(#+) /gm, "#$1 ") : text).replace(/\n{3,}/g, "\n\n").trim();
}
const reference = (title: string, lead: string, parts: readonly string[]): string =>
  `# ${title}\n\n${lead} Generated from the code by \`scripts/gen-docs.ts\`; do not edit.\n\n${parts.join("\n\n")}\n`;
write(
  join(skillRefs, "elements.md"),
  reference(
    "Elements",
    "Every element a file can use, with its props.",
    documented.map(([name, summary]) => forAgent(elementPage(name, summary))),
  ),
);
const units = effectsIndex();
write(
  join(skillRefs, "effects.md"),
  reference("Effects and transitions", "Every built-in effect and transition, with its params and defaults.", [
    forAgent(units.slice(units.indexOf("## Units"))),
    ...(Object.keys(EFFECTS) as (keyof typeof EFFECTS)[]).map((name) => forAgent(effectPage(name))),
    ...(Object.keys(TRANSITIONS) as (keyof typeof TRANSITIONS)[]).map((name) => forAgent(transitionPage(name))),
  ]),
);
write(
  join(skillRefs, "components.md"),
  reference(
    "Components",
    "The ready-made components, imported from `@uberscene/kit`. Positions are pixels from the frame's centre; colours default to theme tokens; each takes the timing props any element takes.",
    (Object.keys(COMPONENTS) as (keyof typeof COMPONENTS)[]).map((name) => forAgent(componentPage(name))),
  ),
);
write(join(skillRefs, "rendering.md"), `${forAgent(renderingPage(), false)}\n`);
// The CLI page's synopsis is the `--help` text's usage lines, so the two cannot differ; the rest of the page is
// written by hand, and the check fails on a flag the help names that the page never mentions.
const cliPage = join(out, "cli.md");
const usage = /const USAGE = `([\s\S]*?)`;/.exec(
  readFileSync(join(root, "packages", "render", "src", "cli.ts"), "utf8"),
)?.[1];
if (!usage) throw new Error("no USAGE in packages/render/src/cli.ts");
const synopsis = usage
  .slice(0, usage.indexOf("\n\n"))
  .replace(/^Usage: /, "")
  .replace(/\n {8,}(?=\[)/g, " ") // a line continued under the one before
  .split("\n")
  .map((line) => `npx ${line.trim()}`);
const cliText = readFileSync(cliPage, "utf8").replace(
  /(```sh\nnpm install uberscene\n)[\s\S]*?(\n```)/,
  (_, open: string, close: string) => `${open}${synopsis.join("\n")}${close}`,
);
for (const flag of new Set(usage.match(/--[a-z][a-z-]*/g)))
  if (!cliText.includes(flag)) undocumented.push(`cli ${flag} (docs/reference/cli.md)`);
write(cliPage, cliText);
write(join(skillRefs, "cli.md"), `${forAgent(cliText, false)}\n`);

// The blocks: the guide page's catalogue is generated from each block's `meta`, schema and preview, between two
// markers in a page otherwise written by hand, and the skill gets the same catalogue without the pictures.
const BLOCKS = listBlocks();
const blocksPage = join(root, "docs", "guide", "blocks.md");
const blocksText = readFileSync(blocksPage, "utf8");
const START = "<!-- catalogue: generated by scripts/gen-docs.ts from blocks/; do not edit -->";
const END = "<!-- end of catalogue -->";
if (!blocksText.includes(START) || !blocksText.includes(END))
  throw new Error(`docs/guide/blocks.md has lost its catalogue markers`);
write(
  blocksPage,
  `${blocksText.slice(0, blocksText.indexOf(START) + START.length)}\n\n${blocksCatalogue(BLOCKS, true)}\n${blocksText.slice(blocksText.indexOf(END))}`,
);
write(
  join(skillRefs, "blocks.md"),
  reference(
    "Blocks",
    "The blocks that ship with the CLI, what each is for, and what can be set where it is placed. `uberscene blocks add <name> --into video.tsx --track <id> --at <moment>` copies one into the project and places it; set its props on the tag where it is placed.",
    [forAgent(blocksCatalogue(BLOCKS, false), false)],
  ),
);

const problems: string[] = syncGeneratedFiles(root, generated, {
  check,
  directories: [
    "docs/reference/elements",
    "docs/reference/effects",
    "docs/reference/components",
    "docs/reference/transitions",
    "examples/showcase/effects",
    "examples/showcase/transitions",
    "plugins/uberscene/skills/uberscene/references",
  ],
  obsolete: ["docs/reference/elements.md", "docs/reference/effects.md", "docs/reference/graphics"],
});
problems.push(...[...new Set(undocumented)].map((u) => `no JSDoc: ${u}`));
if (problems.length) {
  console.error(
    `Generated reference is stale or undocumented (${problems.length}). Run pnpm docs:gen; document each prop and action in its code.`,
  );
  for (const problem of problems) console.error(problem);
  process.exitCode = 1;
} else {
  console.log(`${check ? "Checked" : "Generated"} ${generated.size} reference/sidebar files.`);
}

/** A knob's default for a table cell: short values as they are, lists and long text by what they hold. */
function blockDefault(value: unknown): string {
  if (value === undefined) return "";
  if (Array.isArray(value)) return `${value.length} ${value.length === 1 ? "item" : "items"}`;
  const text = JSON.stringify(value);
  return `\`${cell(text.length > 40 ? `${text.slice(0, 37)}…` : text)}\``;
}

/**
 * The catalogue of blocks: on the site a grid of their previews, each a link to its section; then a section a block,
 * with what it is for, its timing and its props.
 */
function blocksCatalogue(blocks: readonly BlockInfo[], site: boolean): string {
  const lines: string[] = [];
  if (site) {
    lines.push('<div class="cc-cards cc-blocks">');
    for (const b of blocks)
      lines.push(
        `<div><a class="cc-card" href="#${b.name}"><img class="cc-block-preview" src="../../blocks/${b.name}/preview.png" alt="${attr(b.title)}" /><span class="cc-card-title"><code>${b.name}</code></span><span class="cc-card-text">${attr(b.what)}</span></a></div>`,
      );
    lines.push("</div>", "");
  }
  for (const b of blocks) {
    lines.push(
      site ? `### ${b.title} {#${b.name}}` : `## ${b.title}: \`${b.name}\``,
      "",
      escapeTags(b.what),
      "",
      `- **Use it for:** ${escapeTags(b.useWhen.join("; "))}.`,
      ...(b.avoidWhen.length ? [`- **Not for:** ${escapeTags(b.avoidWhen.join("; "))}.`] : []),
      ...(b.pairsWith.length ? [`- **Goes with:** ${b.pairsWith.map((n) => `\`${n}\``).join(", ")}.`] : []),
      `- **Length:** ${b.length} s with its defaults; given longer, it holds its last state. **Frame:** ${b.aspects.join(", ")}.${b.beats.length ? ` **Timed by:** ${b.beats.map((n) => `\`${n}\``).join(", ")}.` : ""}`,
      "",
      "| prop | kind | default | what it is |",
      "|---|---|---|---|",
      ...b.props.map(
        (p) =>
          `| \`${p.key}\` | ${p.kind}${p.optional ? ", optional" : ""} | ${blockDefault(p.value)} | ${cell(p.description ?? "")} |`,
      ),
      "",
      "```sh",
      `npx uberscene blocks add ${b.name} --into video.tsx --track graphics --at 2`,
      "```",
      "",
    );
  }
  return lines.join("\n");
}
