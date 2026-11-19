# The file

A UberScene video is one TSX module. [Anatomy of a video](./anatomy) introduces the elements inside it and
[Anatomy of an element](./elements) the props on each; this page covers the file around them: what it exports, what
it may import, and the few rules that keep it editable.

**See it in:** every [showcase file](/examples/) (each has `schema` and `defaults`), [Variants from one file](/recipes/variants)
(one cut, many versions), and the [walkthrough](/guide/writing-files), which explains a whole file line by line.

```tsx
import { z } from "zod";
import { Clip, Composition, Title, Track, Transition } from "@uberscene/kit";

export const schema = z.object({
  product: z.string().describe("Product name on the title card"),
  accent: z.string().describe("Accent colour"),
});
export const defaults = { product: "Shed", accent: "#ff5a1f" };

export default function Video({ product, accent }: z.infer<typeof schema>) {
  return (
    <Composition fps={30} width={1920} height={1080}>
      <Track id="main">
        <Clip id="hook" src="asset:founder" in="word:12" out="word:23.end" />
        <Transition id="x1" type="crossfade" duration={0.4} />
        <Clip id="broll" src="asset:product" in="shot:1" out="shot:1.end" fit="cover" />
      </Track>
      <Track id="overlays">
        <Title id="title" anchor="hook" at="word:14" duration={2.8} color={accent}>{product}</Title>
      </Track>
    </Composition>
  );
}
```

There is no project file next to it. The editor edits this file, the player plays it, and the export renders it. A
model that wrote it can read your changes in it later, because they are in the same text.

## What a file exports

| Export | Is |
|---|---|
| `default` | A component that returns a `<Composition>`: the video. |
| `schema` | Optional. A zod object of the values someone should be able to change. |
| `defaults` | Optional. The values the video renders with. |
| `manifest` | Optional. The media the file uses; the command line uses it instead of the nearest `uberscene.json`, unless given `--manifest`. |

## What a file may import

A file may import `react`, `zod` and `@uberscene/kit`. The app that loads it can offer more, such as three.js (see
[Free code](./free-code#libraries)). An import the app doesn't offer fails with a message that lists what it does
offer.

## The lint

The rules on this page are checked by the **lint**: `lint()` from `@uberscene/kit/source`. An editor runs it on the
file as you type and shows its findings like a compiler's warnings, each naming its rule (`literal-ids`). The command
line doesn't run it yet. [Lint](./editing#lint) lists every rule.

## `schema` and `defaults` are the knobs

`schema` describes the values someone should be able to change: a product name, a colour, a call to action. An
inspector shows a control for each field, using its description as the label. Changing one renders the video with the
new value, and saving rewrites the `defaults` literal and nothing else.

```tsx
import { z } from "zod";
import { knob } from "@uberscene/kit";

export const schema = z.object({
  product: z.string().describe("Product name in the title"),
  accent: knob.color().describe("Colour of the title and the rule under it"),
  heading: knob.font().describe("Font of the title"),
  logo: knob.image().describe("Logo on the closing card"),
  look: z.enum(["dark", "light"]).describe("Background of the closing card"),
  cards: z.number().int().min(1).max(6).describe("How many feature cards"),
});
export const defaults = {
  product: "Shed", accent: "#ff5a1f", heading: "Inter", logo: "asset:logo", look: "dark", cards: 3,
};
```

The control follows the kind. Strings, numbers and booleans get a text field, a number field (bounded by `min` and
`max`) and a switch; a `z.enum` gets a menu. Three strings want more than a text field, and the kit marks them:

| Helper | Holds | Control |
|---|---|---|
| `knob.color()` | Any CSS colour, or a theme token such as `$primary` | A colour picker |
| `knob.font()` | A family the file can use: bundled, or declared with `font()` or `googleFont()` | A font menu |
| `knob.image()` | An asset reference (`asset:logo`) or a URL | An image picker |

Describe each value by what it means in the video, not by its type: "Colour of the title", not "accent colour".
`uberscene inspect` lists the knobs before the timeline, and `knobsOf(schema, defaults)` returns them to an app that
builds its own controls.

How an editor treats a prop depends on what it is written as:

| Written as | In the editor |
|---|---|
| A literal, `out={9}` | Editable: a drag rewrites the value. |
| A schema value, `color={accent}` | Bound: a drag changes the value in `defaults`, and every element that reads it follows. |
| An expression, `out={start + 2}` | Locked: nothing says what a new value should become. The editor offers to replace it with a literal first, and the lint warns (`expression-locked`). |

## Timeline elements and free code

`<Composition>`, `<Track>`, `<Clip>`, `<Audio>`, `<Transition>`, `<Captions>` and the other timeline elements render
nothing themselves. UberScene reads their props to place footage and sound in time, and an editor edits those props
from its timeline. That only works for elements it knows, so a `<div>` placed straight in a track draws nothing and
the lint warns about it.

Everything drawn over the footage can be free code: put it in a `<Layer>` and any React, CSS, canvas or WebGL renders
([Free code](./free-code)). The ready-made `<Title>`, `<Shape>`, `<Svg>` and the rest, and components like
`LowerThird` built from them, cover the common cases with props an inspector can edit
([Elements, components and free code](./elements#elements-components-and-free-code)).

## Every element has a literal id

`hook`, `broll`, `title`. A drag on the timeline finds its element by id, and the edit it makes names the same id.
The player puts `data-el="hook"` on what it draws, so an editor can select things in the preview too.

- An id written as an expression, like ``id={`clip-${i}`}``, can't be found that way, so the lint reports it
  (`literal-ids`). Inside a [helper](#helpers) that makes several elements, a generated pattern is fine.
- Ids must be unique among timeline elements. An `id` on a `<div>` inside a Layer is ordinary HTML and doesn't count.

## Children for collections

A clip's keyframes are `<Keyframe>` children, not a `keyframes={[…]}` array. Captions, effects, masks, speed keys and
freezes work the same way. Each child has its own id and its own place in the file, so an editor can change one
keyframe or move one caption.

```tsx
<Clip id="broll" src="asset:product" in="shot:1" out="shot:1.end" fit="cover">
  <Keyframe id="broll-s0" property="transform.scale.x" at={0} value={1} />
  <Keyframe id="broll-s1" property="transform.scale.x" at={6} value={1.08} easing="easeInOutSine" />
</Clip>
```

[What it holds](./elements#_6-what-it-holds-children) lists every kind of child.

## Helpers

A function that returns timeline elements is a helper. Use one to write a group of elements once, such as a name card:

```tsx
function NameCard({ who, what }: { who: string; what: string }) {
  return <>
    <Shape id="lt-bg" anchor="close" offset={0.5} duration={3.2} shape="rectangle" width={760} height={150} />
    <Title id="lt-who" anchor="lt-bg" duration={3.2}>{who}</Title>
    <Title id="lt-what" anchor="lt-bg" offset={0.2} duration={3}>{what}</Title>
  </>;
}
```

| Used | In the editor |
|---|---|
| Once | Fully editable: its elements resolve to plain values, and the editor edits them directly. |
| Twice or more | Its elements are marked as generated. The first edit to one copy writes that helper's output into the file as literals, then applies the change. |

::: warning Helpers must be pure
UberScene calls a helper like a plain function to find its elements, so a helper that makes timeline elements must be
pure: no state or effects, and no hooks other than `useT()` and `useLayer()`. The lint checks this (`pure-helpers`).
Components that only draw, inside a `<Layer>`, can use any hooks they like.
:::

## Next

- [Timing](./time): every way to say when.
- [Free code](./free-code): what a layer can draw.
- [Editing](./editing): how an editor changes the file, and every lint rule.
- [Variants from one file](/recipes/variants): one cut, many versions from `schema`.
