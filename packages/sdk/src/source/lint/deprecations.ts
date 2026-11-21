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

/** Every respelling the kit knows how to move a file across. */
export const DEPRECATIONS: readonly Deprecation[] = [
  ...TITLE_LOOK.map(
    (prop): Deprecation => ({ element: "Title", prop, to: { into: "style", wrap: "preset" }, since: "0.6.0" }),
  ),
  { element: "Captions", prop: "align", to: { into: "style", wrap: "preset" }, since: "0.6.0" },
];
