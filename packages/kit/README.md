<p align="center"><img src="https://raw.githubusercontent.com/prefix-tree/uberscene/main/docs/public/logo.svg" width="64" alt="UberScene"></p>

# @uberscene/kit

What an [UberScene](https://uberscene.prefixtree.xyz/) video file imports: the elements it is written in, the
ready-made components, the hooks and helpers for free code, the diagram parts and the theme. It has no DOM and runs
anywhere.

```sh
npm install @uberscene/kit react zod
```

## A file

```tsx
import { z } from "zod";
import { Clip, Composition, Title, Track, Transition } from "@uberscene/kit";

export const schema = z.object({ title: z.string(), accent: z.string() });
export const defaults = { title: "Why we built it", accent: "#ff5a1f" };

export default function Video({ title, accent }: z.infer<typeof schema>) {
  return (
    <Composition fps={30} width={1920} height={1080}>
      <Track id="main">
        <Clip id="c1" src="asset:interview" in="word:3" out="word:18" />
        <Transition id="x1" type="crossfade" duration={0.5} />
        <Clip id="c2" src="asset:city" duration={4} fit="cover" />
      </Track>
      <Track id="overlays">
        <Title id="t1" anchor="c1" offset={1} duration={3} style={{ color: accent }}>{title}</Title>
      </Track>
    </Composition>
  );
}
```

`in` and `out` can point into the asset manifest (`word:N`, `shot:N.end`, `silence:N`, `marker:ID`), so a cut stays on
its word when the clip moves. Each timeline element has a literal `id`. A track is a magnetic sequence unless it says
`layout="free"`. A `<Layer>` holds any React you like.

## What else is in it

| | |
|---|---|
| `interpolate`, `spring`, `random`, `stepAt` | Pure animation helpers for free code. `useT()` and `useLayer()` give the layer's clock once a player is mounted, and `useSeekable` plays a GSAP, Anime.js or Lottie animation on it. |
| `LowerThird`, `Callout`, `Counter`, … | Ready-made components that return the kit's own titles, shapes and SVG. |
| `DrawnLine`, `Label`, `CountUp`, `Cells` | Parts for drawing a diagram inside a `<Layer>`. |
| `narrate`, `knob`, `font`, `googleFont`, `themeCss` | A narration timed from its script, schema helpers for an editor's pickers, fonts, and the theme as CSS. |
| `@uberscene/kit/schema` | The vocabulary as data, for tools: element schemas and capabilities, the effect and transition registries, enums, fonts and themes. |

The kit doesn't place, edit or draw anything. [`@uberscene/sdk`](https://www.npmjs.com/package/@uberscene/sdk) reads a
file, places everything in time and edits it; [`@uberscene/player`](https://www.npmjs.com/package/@uberscene/player)
plays it in the browser, and [`uberscene`](https://www.npmjs.com/package/uberscene) exports it.

## Docs

- [The file](https://uberscene.prefixtree.xyz/guide/the-file) and [Time by meaning](https://uberscene.prefixtree.xyz/guide/time)
- [Free code](https://uberscene.prefixtree.xyz/guide/free-code)
- [Elements](https://uberscene.prefixtree.xyz/reference/elements/) and [components](https://uberscene.prefixtree.xyz/reference/components/)

MIT licensed.
