// Ready-made components: lower thirds, callouts, counters and the like, each an ordinary function that returns the
// kit's own elements (titles, shapes, SVG, a layer where something must move every frame). They are timed, styled
// and checked like any element, and editing one of their parts writes that use out into the file as literals.
import type { z } from "zod";

import { Badge, badgeSchema } from "./badge";
import { Callout, calloutSchema } from "./callout";
import { Counter, CounterValue, counterSchema } from "./counter";
import { LowerThird, lowerThirdSchema } from "./lower-third";
import { TypeCard, TypeCardBack, TypeCardLine, typeCardSchema } from "./type-card";

export { Badge, Callout, Counter, CounterValue, LowerThird, TypeCard, TypeCardBack, TypeCardLine };

export interface ComponentEntry {
  /** One line on what it is. */
  readonly text: string;
  readonly props: z.ZodObject;
  readonly component: (props: never) => unknown;
}

/** Every ready-made component by name, with its props schema: the reference and the playground read it. */
export const COMPONENTS = {
  LowerThird: {
    text: "A name and a role in the lower third, on a card or beside an accent bar.",
    props: lowerThirdSchema,
    component: LowerThird,
  },
  Callout: {
    text: "A note in a box, with a line drawn to what it is about.",
    props: calloutSchema,
    component: Callout,
  },
  Badge: { text: "A short word on a pill that pops in.", props: badgeSchema, component: Badge },
  Counter: { text: "A number that counts to its value, with a label.", props: counterSchema, component: Counter },
  TypeCard: {
    text: "A card of big type that builds line by line, with pills and struck-out lines.",
    props: typeCardSchema,
    component: TypeCard,
  },
} as const satisfies Record<string, ComponentEntry>;

/** The components' names: a file's `<LowerThird>` is a helper the editor can write out (bake). */
export const COMPONENT_NAMES: ReadonlySet<string> = new Set(Object.keys(COMPONENTS));
