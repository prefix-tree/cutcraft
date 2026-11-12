// Ready-made components: lower thirds, callouts, counters and the like, each an ordinary function that returns the
// kit's own elements (titles, shapes, SVG, a layer where something must move every frame). They are timed, styled
// and checked like any element, and editing one of their parts writes that use out into the file as literals.
import type { z } from "zod";

import { Arrow, arrowSchema } from "./arrow";
import { Background, backgroundSchema } from "./background";
import { Badge, badgeSchema } from "./badge";
import { Callout, calloutSchema } from "./callout";
import { Counter, CounterValue, counterSchema } from "./counter";
import { Frame, frameSchema } from "./frame";
import { Highlight, highlightSchema } from "./highlight";
import { LowerThird, lowerThirdSchema } from "./lower-third";
import { ProgressBar, progressBarSchema } from "./progress-bar";
import { QuoteCard, QuoteCardPart, quoteCardSchema } from "./quote-card";
import { TypeCard, TypeCardBack, TypeCardLine, typeCardSchema } from "./type-card";

export {
  Arrow,
  Background,
  Badge,
  Callout,
  Counter,
  CounterValue,
  Frame,
  Highlight,
  LowerThird,
  ProgressBar,
  QuoteCard,
  QuoteCardPart,
  TypeCard,
  TypeCardBack,
  TypeCardLine,
};

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
  ProgressBar: {
    text: "A bar that fills from the left to its value.",
    props: progressBarSchema,
    component: ProgressBar,
  },
  Arrow: { text: "An arrow drawn from one point to another, straight or bowed.", props: arrowSchema, component: Arrow },
  Highlight: {
    text: "A hand-drawn underline, marker stroke, circle or strike on something in the frame.",
    props: highlightSchema,
    component: Highlight,
  },
  Background: {
    text: "A full-frame gradient, dots or grid to put beneath everything.",
    props: backgroundSchema,
    component: Background,
  },
  TypeCard: {
    text: "A card of big type that builds line by line, with pills and struck-out lines.",
    props: typeCardSchema,
    component: TypeCard,
  },
  QuoteCard: {
    text: "A passage on a paper card with its source, and a marker over the phrases that matter.",
    props: quoteCardSchema,
    component: QuoteCard,
  },
  Frame: { text: "A rounded border around part of the picture.", props: frameSchema, component: Frame },
} as const satisfies Record<string, ComponentEntry>;

/** The components' names: a file's `<LowerThird>` is a helper the editor can write out (bake). */
export const COMPONENT_NAMES: ReadonlySet<string> = new Set(Object.keys(COMPONENTS));
