// One example per built-in effect and transition, for the reference: what it shows, and the whole file that renders
// it. The docs generator writes each file to examples/showcase/effects/ or transitions/, the showcase renders it, and
// the reference page shows the video above the same file, so the code and the video cannot disagree.
//
// Every demo looks alike, so the pages read as one gallery:
// - colour, footage, basic adjustments, vignette and grain: the coffee shot, the effect keyed from where it changes
//   nothing up to its example value, then held, so the video shows the change;
// - title looks: one word over moving gradients, the look keyed up the same way;
// - transitions: the coffee close-up into the same scene wide, the transition in the middle, at its defaults.
import type { EFFECTS, TRANSITIONS } from "../packages/kit/src/effects/registry";

export const EXAMPLE_WIDTH = 640;
export const EXAMPLE_HEIGHT = 360;
export const EXAMPLE_SECONDS = 3;

type Value = string | number | boolean | readonly Value[];

/** A param keyed from `from` (where the effect changes nothing, or a plain start) to `to`. */
interface Animate {
  readonly param: string;
  readonly from: Value;
  readonly to: Value;
}

interface EffectDemo {
  /** One line on what the effect does, for the reference and the top of the file. */
  readonly text: string;
  /** What it is drawn on: a shot, a title, a keyed layer over a shot, or a pinned shot over another. */
  readonly on: "shot" | "title" | "key" | "pin";
  readonly params?: Readonly<Record<string, Value>>;
  readonly animate?: readonly Animate[];
  /** The shot it is drawn on, when not the close-up. */
  readonly shot?: Shot;
}

interface Shot {
  readonly src: string;
  readonly in: number;
}

/** The shot most demos use: the pour, close up, where the picture moves. */
const SHOT: Shot = { src: "coffee", in: 12 };
/** The same scene wide: the kettle pouring, a person at the right edge. */
const WIDE: Shot = { src: "coffeeWide", in: 4 };

const line = [
  [0, 0],
  [1, 1],
];

export const EFFECT_DEMOS: Readonly<Record<keyof typeof EFFECTS, EffectDemo>> = {
  brightness: {
    text: "Lightens or darkens the picture.",
    on: "shot",
    animate: [{ param: "amount", from: 0, to: 0.3 }],
  },
  contrast: {
    text: "Pushes lights and darks apart, or pulls them together.",
    on: "shot",
    animate: [{ param: "amount", from: 0, to: 0.5 }],
  },
  saturation: { text: "Makes colours richer or greyer.", on: "shot", animate: [{ param: "amount", from: 0, to: 0.8 }] },
  hue: {
    text: "Turns every colour around the colour wheel.",
    on: "shot",
    animate: [{ param: "angle", from: 0, to: 180 }],
  },
  grayscale: { text: "Takes the colour out.", on: "shot", animate: [{ param: "amount", from: 0, to: 1 }] },
  sepia: {
    text: "Tones the picture brown, like an old print.",
    on: "shot",
    animate: [{ param: "amount", from: 0, to: 1 }],
  },
  invert: { text: "Turns the picture into its negative.", on: "shot", animate: [{ param: "amount", from: 0, to: 1 }] },
  blur: {
    text: "Softens the picture; the radius is the Gaussian's standard deviation, in pixels.",
    on: "shot",
    animate: [{ param: "radius", from: 0, to: 8 }],
  },
  shadow: {
    text: "Casts a soft drop shadow behind the element's own shape.",
    on: "title",
    params: { x: 8, y: 8, radius: 3 },
    animate: [{ param: "opacity", from: 0, to: 0.9 }],
  },
  vignette: {
    text: "Darkens the edges of a clip, a nested sequence, or everything beneath an adjustment.",
    on: "shot",
    animate: [{ param: "amount", from: 0, to: 0.9 }],
  },
  grain: {
    text: "Adds moving film grain to a clip, a nested sequence, or everything beneath an adjustment.",
    on: "shot",
    animate: [{ param: "amount", from: 0, to: 0.6 }],
  },
  levels: {
    text: "Sets the black point, the white point and the gamma between them.",
    on: "shot",
    animate: [{ param: "black", from: 0, to: 0.15 }],
  },
  lut: {
    text: "Grades through a 3D lookup table from a `.cube` file.",
    on: "shot",
    params: { src: "asset:warm" },
    animate: [{ param: "amount", from: 0, to: 1 }],
  },
  exposure: {
    text: "Brightens or darkens in stops, as a camera would.",
    on: "shot",
    animate: [{ param: "stops", from: 0, to: 1 }],
  },
  vibrance: {
    text: "Lifts the muted colours more than the strong ones.",
    on: "shot",
    animate: [{ param: "amount", from: 0, to: 0.8 }],
  },
  whiteBalance: {
    text: "Warms or cools the picture, and tints it toward green or magenta.",
    on: "shot",
    animate: [{ param: "temperature", from: 0, to: 0.6 }],
  },
  shadowsHighlights: {
    text: "Opens up the shadows or holds back the highlights.",
    on: "shot",
    animate: [{ param: "shadows", from: 0, to: 0.7 }],
  },
  duotone: {
    text: "Maps the picture's brightness onto two colours.",
    on: "shot",
    animate: [{ param: "amount", from: 0, to: 1 }],
  },
  curves: {
    text: "Reshapes the tones through curves, for all channels or each one.",
    on: "shot",
    animate: [
      {
        param: "rgb",
        from: line,
        to: [
          [0, 0],
          [0.25, 0.15],
          [0.75, 0.88],
          [1, 1],
        ],
      },
    ],
  },
  colorKey: {
    text: "Makes one colour transparent: a green screen.",
    on: "key",
    params: { color: "#00b140" },
    animate: [{ param: "tolerance", from: 0, to: 0.3 }],
  },
  regionBlur: {
    text: "Blurs a box of the frame, to hide a face, a person, a plate or a screen.",
    on: "shot",
    shot: WIDE,
    params: { box: [0.66, 0, 0.34, 1], roundness: 0.3, feather: 16 },
    animate: [{ param: "radius", from: 0, to: 18 }],
  },
  cornerPin: {
    text: "Moves the picture's four corners, to place it in a screen or a frame.",
    on: "pin",
    animate: [
      { param: "topLeft", from: [0, 0], to: [0.2, 0.14] },
      { param: "topRight", from: [1, 0], to: [0.84, 0.06] },
      { param: "bottomRight", from: [1, 1], to: [0.88, 0.9] },
      { param: "bottomLeft", from: [0, 1], to: [0.14, 0.82] },
    ],
  },
  zoomBlur: {
    text: "Streaks the picture out from a centre.",
    on: "shot",
    animate: [{ param: "length", from: 0, to: 60 }],
  },
  chromaticAberration: {
    text: "Splits red and blue apart, as a cheap lens does.",
    on: "shot",
    animate: [{ param: "distance", from: 0, to: 10 }],
  },
  glow: {
    text: "Lights a halo around the bright parts.",
    on: "title",
    animate: [{ param: "intensity", from: 0, to: 2 }],
  },
  outline: {
    text: "Draws a line around the element's shape.",
    on: "title",
    params: { color: "#c8402a" },
    animate: [{ param: "width", from: 0, to: 6 }],
  },
  longShadow: {
    text: "Extrudes a long, hard shadow from the element's shape.",
    on: "title",
    animate: [{ param: "opacity", from: 0, to: 1 }],
  },
  bevel: {
    text: "Gives the element's shape a raised, lit edge.",
    on: "title",
    animate: [{ param: "amount", from: 0, to: 0.8 }],
  },
  halftone: {
    text: "Prints the picture as a screen of dots, in one ink or four.",
    on: "shot",
    params: { size: 7 },
    animate: [{ param: "amount", from: 0, to: 1 }],
  },
  pixelate: {
    text: "Turns the picture, or a box of it, into a coarse mosaic.",
    on: "shot",
    shot: WIDE,
    params: { box: [0.66, 0, 0.34, 1] },
    animate: [{ param: "size", from: 1, to: 18 }],
  },
  scanlines: {
    text: "Lays the dark lines of an old screen over the picture.",
    on: "shot",
    params: { spacing: 4, speed: 8 },
    animate: [{ param: "intensity", from: 0, to: 0.5 }],
  },
  lightLeak: {
    text: "Washes warm light in from the edges, as light leaking into a film camera.",
    on: "shot",
    params: { evolution: 0.4 },
    animate: [{ param: "intensity", from: 0, to: 0.7 }],
  },
  fractalNoise: {
    text: "Blends a moving cloud of noise over the picture: mist, smoke or texture.",
    on: "shot",
    params: { blend: "screen", size: 140, contrast: 1.6, evolution: 0.5 },
    animate: [{ param: "opacity", from: 0, to: 0.6 }],
  },
};

export const TRANSITION_TEXT: Readonly<Record<keyof typeof TRANSITIONS, string>> = {
  crossfade: "Fades one clip into the next.",
  dipToBlack: "Fades out to black, then in to the next clip.",
  dipToWhite: "Fades out to white, then in to the next clip.",
  wipe: "Wipes the next clip over the first, edge first.",
  slide: "Slides the next clip in over the first.",
  push: "Pushes the first clip out as the next comes in.",
  iris: "Opens the next clip through a growing circle, polygon or star.",
  clockWipe: "Sweeps the next clip in around a centre, like a clock hand.",
  blinds: "Opens the next clip through turning slats.",
  filmBurn: "Burns through the film into the next clip.",
  pixelDissolve: "Dissolves into the next clip square by square.",
  zoom: "Zooms through the first clip into the next, with a blur.",
};

/** A JSX attribute value. */
function value(v: Value): string {
  return typeof v === "string" ? JSON.stringify(v) : `{${literal(v)}}`;
}

/** A value as TypeScript writes it. */
function literal(v: Value | Readonly<Record<string, Value>>): string {
  if (Array.isArray(v)) return `[${v.map((x: Value) => literal(x)).join(", ")}]`;
  if (typeof v === "object")
    return `{ ${Object.entries(v)
      .map(([k, x]) => `${k}: ${literal(x)}`)
      .join(", ")} }`;
  return JSON.stringify(v);
}

/** The `<Effect>`, its keyframes inside it, indented to `pad`. */
function effectElement(name: string, demo: EffectDemo, pad: string): string[] {
  const params = demo.params && Object.keys(demo.params).length > 0 ? ` params={${literal(demo.params)}}` : "";
  const open = `${pad}<Effect id="look" type="${name}"${params}`;
  if (!demo.animate) return [`${open} />`];
  const keys = demo.animate.flatMap((a, i) => [
    `${pad}  <Keyframe id="k${2 * i + 1}" param="${a.param}" at={0.5} value=${value(a.from)} />`,
    `${pad}  <Keyframe id="k${2 * i + 2}" param="${a.param}" at={1.5} value=${value(a.to)} easing="ease-in-out" />`,
  ]);
  return [`${open}>`, ...keys, `${pad}</Effect>`];
}

const shot = (id: string, src: string, from: number, children: string[]): string[] =>
  children.length === 0
    ? [`        <Clip id="${id}" src="asset:${src}" in={${from}} out={${from + EXAMPLE_SECONDS}} fit="cover" />`]
    : [
        `        <Clip id="${id}" src="asset:${src}" in={${from}} out={${from + EXAMPLE_SECONDS}} fit="cover">`,
        ...children,
        "        </Clip>",
      ];

/** The whole file a built-in effect's demo renders, unformatted (the generator formats it as the repository does). */
export function effectExample(name: keyof typeof EFFECTS): string {
  const demo = EFFECT_DEMOS[name];
  const look = effectElement(name, demo, "          ");
  const tracks: string[] = [];
  const own = demo.shot ?? SHOT;
  if (demo.on === "shot")
    tracks.push('      <Track id="main">', ...shot("shot", own.src, own.in, look), "      </Track>");
  if (demo.on === "key")
    tracks.push(
      '      <Track id="main">',
      ...shot("shot", WIDE.src, WIDE.in, []),
      "      </Track>",
      '      <Track id="keyed">',
      ...shot("greenscreen", "greenscreen", 0, look),
      "      </Track>",
    );
  if (demo.on === "pin")
    tracks.push(
      '      <Track id="main">',
      ...shot("backdrop", WIDE.src, WIDE.in, []),
      "      </Track>",
      '      <Track id="pinned">',
      ...shot("shot", SHOT.src, SHOT.in, look),
      "      </Track>",
    );
  if (demo.on === "title")
    tracks.push(
      '      <Track id="main">',
      ...shot("backdrop", "aurora", 0, []),
      "      </Track>",
      '      <Track id="text" layout="free">',
      `        <Title id="word" start={0} duration={${EXAMPLE_SECONDS}} size={140} color="#e8a33d">`,
      ...look,
      "          Shed",
      "        </Title>",
      "      </Track>",
    );
  const imports = [
    "Clip",
    "Composition",
    "Effect",
    ...(demo.animate ? ["Keyframe"] : []),
    ...(demo.on === "title" ? ["Title"] : []),
    "Track",
  ];
  return [
    `import { ${imports.join(", ")} } from "@cutcraft/kit";`,
    "",
    `// ${name}: ${demo.text.replace(/`/g, "")}`,
    "export default function Video() {",
    "  return (",
    `    <Composition fps={30} width={${EXAMPLE_WIDTH}} height={${EXAMPLE_HEIGHT}}>`,
    ...tracks,
    "    </Composition>",
    "  );",
    "}",
    "",
  ].join("\n");
}

/** The whole file a built-in transition's demo renders: the close-up into the wide shot, at the transition's defaults. */
export function transitionExample(name: keyof typeof TRANSITIONS): string {
  return [
    'import { Clip, Composition, Track, Transition } from "@cutcraft/kit";',
    "",
    `// ${name}: ${TRANSITION_TEXT[name]}`,
    "export default function Video() {",
    "  return (",
    `    <Composition fps={30} width={${EXAMPLE_WIDTH}} height={${EXAMPLE_HEIGHT}}>`,
    '      <Track id="main">',
    '        <Clip id="first" src="asset:coffee" in={1} out={3} fit="cover" />',
    `        <Transition id="change" type="${name}" duration={1} />`,
    `        <Clip id="next" src="asset:${WIDE.src}" in={${WIDE.in}} out={${WIDE.in + 2}} fit="cover" />`,
    "      </Track>",
    "    </Composition>",
    "  );",
    "}",
    "",
  ].join("\n");
}
