# The file

A CutCraft video is one TSX module. It has a default export, a component that returns a `<Composition>`, and two
optional exports for the values you want to change later without touching the edit.

**See it in:** every [showcase file](/examples) (each has `schema` and `defaults`), [Variants from one file](/recipes/variants)
(one cut, many versions), and the [walkthrough](/guide/writing-files), which explains a whole file line by line.

```tsx
import { z } from "zod";
import { Clip, Composition, Title, Track, Transition } from "@cutcraft/kit";

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

A file may import `react`, `zod` and `@cutcraft/kit`. The app that loads it can offer more, such as three.js (see
[Free code](./free-code#libraries)). An import the app doesn't offer fails with a message that lists what it does offer.

## Timeline elements and free code

`<Composition>`, `<Track>`, `<Clip>`, `<Audio>`, `<Transition>`, `<Captions>` and the other timeline elements render
nothing themselves. CutCraft reads their props to place footage and sound in time, and an editor edits those props
from its timeline. That only works for elements it knows, so a `<div>` placed straight in a track draws nothing and
the lint warns about it.

Everything drawn over the footage can be free code. Put it in a `<Layer>` and any React, CSS, canvas or WebGL
renders: see [Free code](./free-code). The ready-made `<Title>`, `<Graphic>`, `<Shape>` and the rest are there for the
common cases, with props an inspector can edit.

## Every element has a literal id

`hook`, `broll`, `title`. A drag on the timeline finds its element by id, and the edit it makes names the same id.
The player puts `data-el="hook"` on what it draws, so an editor can select things in the preview too. An id written
as an expression, like ``id={`clip-${i}`}``, can't be found that way, so the lint reports it (`literal-ids`).
Inside a helper that makes several elements, a generated pattern is fine.

Ids must be unique among timeline elements. An `id` on a `<div>` inside a Layer is ordinary HTML and doesn't count.

## `schema` and `defaults` are the knobs

`schema` describes the values someone should be able to change: a product name, a colour, a call to action. An
inspector shows a control for each field, using its description as the label. Changing one renders the video with
the new value, and saving rewrites the `defaults` literal and nothing else.

A prop that reads a schema value, like `color={accent}`, is bound: dragging it in the editor changes the value in
`defaults`, and every element that reads it follows. A prop computed from an expression, like `out={start + 2}`, is
locked, because nothing says what a new value should become. The editor offers to replace it with a literal first,
and the lint warns about it (`expression-locked`).

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

## Helpers

A function that returns timeline elements is a helper. A helper used once stays fully editable: its elements resolve
to plain values, and the editor edits them directly. Used twice, its elements are marked as generated, and the first
edit to one copy writes that helper's output into the file as literals before applying the change.

```tsx
function LowerThird({ who, what }: { who: string; what: string }) {
  return <>
    <Shape id="lt-bg" anchor="close" offset={0.5} duration={3.2} shape="rectangle" width={760} height={150} />
    <Title id="lt-who" anchor="lt-bg" duration={3.2}>{who}</Title>
    <Title id="lt-what" anchor="lt-bg" offset={0.2} duration={3}>{what}</Title>
  </>;
}
```

CutCraft calls a helper like a plain function to find its elements, so a helper that makes timeline elements must
be pure: no state or effects, and no hooks other than `useT()` and `useLayer()`. The lint checks this
(`pure-helpers`). Components that only draw, inside a `<Layer>`, can use any hooks they like.
