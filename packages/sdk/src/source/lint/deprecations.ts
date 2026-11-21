import {
  BLEND_MODES,
  CAPTION_ANIMATIONS,
  EASINGS,
  ENTRANCE_ANIMATIONS,
  RENAMED_EFFECT_PARAMS,
  RENAMED_TRANSITION_PARAMS,
  RESPELLED_VALUES,
  TEXT_ANIMATION_TYPES,
  TEXT_DECORATIONS,
} from "@uberscene/kit/schema";

/**
 * An old spelling of a prop and what replaced it. The `deprecated-props` rule reports every use and, where the new
 * spelling can be written for certain, carries the fix, so `uberscene lint --fix` moves a file across a breaking
 * release. A release that respells something adds its rows to `DEPRECATIONS`.
 */
export interface Deprecation {
  /** The tag it is on (`"Title"`), or `"*"` for every element and component of the kit. */
  readonly element: string;
  /** The prop, or a dotted path into an object prop (`"animation.preset"`). */
  readonly prop: string;
  readonly to:
    | {
        /** The prop's new name; for a dotted path, the new name of its last key. */
        readonly rename: string;
      }
    | {
        /** The object prop it moved into (`"style"`). */
        readonly into: string;
        /** Its key there; the prop's own name when left out. */
        readonly key?: string;
        /** When `into` already holds a plain value (`style="h1"`), the key that value takes in the object. */
        readonly wrap?: string;
      }
    | {
        /** A value that is spelled another way now. */
        readonly value: { readonly from: string; readonly to: string };
      };
  /**
   * Only where the element's literal `type` is this (`{ type: "shadow" }`), for a prop whose meaning depends on the
   * kind; with `in`, the `type` of the nearest element of that tag it sits in (a `<Keyframe>` inside an `<Effect>`).
   */
  readonly when?: { readonly type: string; readonly in?: string };
  /** The version that changed it. */
  readonly since: string;
  /** A few words more, shown after the message. */
  readonly note?: string;
}

/** A title's look, flat props before 0.6 and fields of its one `style` since: a preset name or an object. */
const TITLE_LOOK = [
  "font",
  "size",
  "weight",
  "italic",
  "color",
  "background",
  "stroke",
  "shadow",
  "align",
  "valign",
  "lineHeight",
  "letterSpacing",
  "decoration",
] as const;

/** Values respelled in camelCase in 0.6 (`RESPELLED_VALUES`), the old ones of each list. */
const oldOf = (values: readonly string[]): string[] =>
  Object.keys(RESPELLED_VALUES).filter((old) => values.includes(RESPELLED_VALUES[old] as string));
const OLD_BLENDS = oldOf(BLEND_MODES);
const OLD_EASINGS = oldOf(EASINGS);
const OLD_ENTRANCES = oldOf(ENTRANCE_ANIMATIONS);
const OLD_TEXT_ANIMATIONS = oldOf(TEXT_ANIMATION_TYPES);
const OLD_CAPTION_ANIMATIONS = oldOf(CAPTION_ANIMATIONS);
const OLD_DECORATIONS = oldOf(TEXT_DECORATIONS);

/** A row for each old value of a list, at each path that takes it. */
const respelled = (
  element: string,
  props: readonly string[],
  values: readonly string[],
  when?: Deprecation["when"],
): Deprecation[] =>
  props.flatMap((prop) =>
    values.map(
      (from): Deprecation => ({
        element,
        prop,
        to: { value: { from, to: RESPELLED_VALUES[from] as string } },
        since: "0.6.0",
        ...(when ? { when } : {}),
      }),
    ),
  );

const rename = (element: string, prop: string, to: string, when?: Deprecation["when"]): Deprecation => ({
  element,
  prop,
  to: { rename: to },
  since: "0.6.0",
  ...(when ? { when } : {}),
});

/** The diagram parts, which take a `When`: `start` (the `at` before 0.6), `after`, `over` and `easing`. */
const DIAGRAM_PARTS = ["DrawnLine", "Label", "CountUp"] as const;

/** One naming rule (0.6): a kind is `type`, a line's thickness `thickness`, a start `start`, enum values camelCase. */
const NAMING: readonly Deprecation[] = [
  rename("Shape", "shape", "type"),
  rename("Shape", "stroke.width", "thickness"),
  rename("Title", "animation.preset", "type"),
  rename("Title", "stroke.width", "thickness"),
  rename("Title", "style.stroke.width", "thickness"),
  rename("Captions", "style.stroke.width", "thickness"),
  rename("LowerThird", "variant", "type"),
  rename("Composition", "background.mode", "type"),
  rename("Svg", "color.mode", "type"),
  rename("Marker", "at", "start"),
  ...DIAGRAM_PARTS.map((part) => rename(part, "at", "start")),
  rename("Label", "lineWidth", "lineThickness"),
  rename("HundredCells", "fill.at", "start"),
  rename("HundredCells", "next.at", "start"),
  // Seconds since the layer started, which is what `after` means everywhere else.
  rename("BarRace", "start", "after"),
  rename("QuoteBuild", "start", "after"),
  ...Object.entries(RENAMED_EFFECT_PARAMS).flatMap(([type, params]) =>
    Object.entries(params).flatMap(([from, to]) => [
      rename("Effect", `params.${from}`, to, { type }),
      // A keyframe of the param names it in its own `param`.
      {
        element: "Keyframe",
        prop: "param",
        to: { value: { from, to } },
        since: "0.6.0",
        when: { type, in: "Effect" },
      } satisfies Deprecation,
    ]),
  ),
  ...respelled("*", ["blend"], OLD_BLENDS),
  ...respelled("*", ["enter.type", "exit.type"], OLD_ENTRANCES),
  ...respelled("*", ["enter.easing", "exit.easing", "easing"], OLD_EASINGS),
  ...DIAGRAM_PARTS.flatMap((part) => respelled(part, ["easing"], OLD_EASINGS)),
  ...respelled("Composition", ["theme.motion.enter.type", "theme.motion.exit.type"], OLD_ENTRANCES),
  ...respelled("Composition", ["theme.motion.enter.easing", "theme.motion.exit.easing"], OLD_EASINGS),
  ...respelled("Title", ["animation.preset", "animation.type"], OLD_TEXT_ANIMATIONS),
  ...respelled("Title", ["decoration", "style.decoration"], OLD_DECORATIONS),
  ...respelled("Captions", ["animation"], OLD_CAPTION_ANIMATIONS),
  ...Object.entries(RENAMED_TRANSITION_PARAMS).flatMap(([type, params]) =>
    Object.entries(params).map(([from, to]) => rename("Transition", `params.${from}`, to, { type })),
  ),
  ...respelled("Transition", ["params.curve"], OLD_EASINGS, { type: "crossfade" }),
];

/** Every respelling the kit knows how to move a file across. */
export const DEPRECATIONS: readonly Deprecation[] = [
  ...TITLE_LOOK.map(
    (prop): Deprecation => ({ element: "Title", prop, to: { into: "style", wrap: "preset" }, since: "0.6.0" }),
  ),
  { element: "Captions", prop: "align", to: { into: "style", wrap: "preset" }, since: "0.6.0" },
  ...NAMING,
];
