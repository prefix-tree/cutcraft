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

/** Every respelling the kit knows how to move a file across. Empty until a release respells something. */
export const DEPRECATIONS: readonly Deprecation[] = [];
