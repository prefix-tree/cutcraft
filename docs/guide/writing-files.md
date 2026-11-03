# A launch video, line by line

This page follows one file from a brief to a finished video: the launch recap in
[`examples/launch-recap`](https://github.com/prefix-tree/cutcraft/tree/main/examples/launch-recap), which a model
wrote. It shows what each part of the file does and links to the guide page that covers it in full.

## The brief

> Make a 25 to 30 second launch recap for Shed, a cloud for small software. Open
> on the founder's key sentence from the interview. Cut to product b-roll with
> a slow push-in, then the screen demo, then back to the founder for the close.
> Put the product name and tagline on a title card at the top, a lower third
> when the founder comes back, captions for everything the founder says, and a
> music bed that ducks under speech. End on a card with the call to action.
> The product name, the tagline, the accent colour and the call to action must
> be tweakable afterwards without touching the edit.

With it came `manifest.json`: five assets. The founder interview has sixty timed words, three shots and four silences;
the product b-roll has three shots; then a screen recording, a music track and the logo.

## The file

```tsx
export const schema = z.object({
  product: z.string().describe("Product name on the title card"),
  tagline: z.string().describe("One line under the title"),
  accent: z.string().describe("Accent colour for the lower third and the call to action"),
  cta: z.string().describe("Call to action on the closing card"),
});
export const defaults = { product: "Shed", tagline: "A cloud for small software", accent: "#ff5a1f", cta: "getshard.sh" };

export default function Video({ product, tagline, accent, cta }: z.infer<typeof schema>) {
  return (
    <Composition fps={30} width={1920} height={1080} background={{ mode: "color", color: "#0b0d12" }}>
      <Marker id="m-hook" at={0} label="hook" />
      <Track id="main" name="Story">
        {/* The sentence the whole recap hangs on; trimmed by words so a re-transcription keeps it. */}
        <Clip id="hook" src="asset:founder" in="word:12" out="word:23.end" />
        <Transition id="x1" type="crossfade" duration={0.4} />
        <Clip id="broll" src="asset:product" in="shot:1" out="shot:1.end" fit="cover">
          <Keyframe id="broll-sx0" property="transform.scale.x" at={0} value={1} easing="easeInOutSine" />
          <Keyframe id="broll-sx1" property="transform.scale.x" at={6} value={1.08} />
          …
        </Clip>
        <Clip id="demo" src="asset:screen" in={2} duration={7} />
        <Transition id="x2" type="crossfade" duration={0.4} />
        <Clip id="close" src="asset:founder" in="word:40" out="word:52.end" />
        <Clip id="outro" src="asset:logo" duration={3} fit="contain" transform={{ scale: 0.35 }} />
      </Track>
      <Track id="overlays" name="Overlays">
        <Title id="title" anchor="start" offset={0.4} duration={2.8} size={120} …>{product}</Title>
        <Title id="tagline" anchor="title" offset={0.5} duration={2.3} …>{tagline}</Title>
        <LowerThird who="Bohdan Snisar" what="Founder, Shed" accent={accent} />
        <Layer id="cta" anchor="outro" offset={0.3} duration={2.5}>
          <CallToAction text={cta} accent={accent} />
        </Layer>
      </Track>
      <Track id="music" layout="free" role="music">
        <Audio id="bed" src="asset:music" start={0} duration="fill" volume={0.35} fade={{ in: 0.5, out: 1.5 }} duck={{ under: "main", to: 0.15 }} />
      </Track>
      <Captions id="captions" style={{ position: "bottom", size: 44 }}>
        <Caption id="cap-1" start={0} end={3} text="Small software still deserves a real cloud." />
        …
      </Captions>
    </Composition>
  );
}
```

The whole file is 95 lines. It resolves to 29 elements and 25.6 seconds.

## What each part does

The four values the brief wanted tweakable are the `schema`. An inspector shows a field for each, and saving one
rewrites `defaults` and nothing else ([The file](./the-file#schema-and-defaults-are-the-knobs)).

`in="word:12" out="word:23.end"` is the sentence "Small software still deserves a real cloud. It should take one
file." CutCraft turns it into 5.6 to 10.8 seconds of the interview. `in="shot:1"` is the b-roll's second shot. The
screen recording has no transcript, so `demo` uses seconds ([Time by meaning](./time#time-references)).

`main` is a sequence track. `hook`, `broll`, `demo`, `close` and `outro` play back to back, and the two crossfades
overlap their neighbours by 0.4 seconds. No clip has a `start`, so trimming `hook` moves everything after it
([Sequence tracks](./time#sequence-tracks-place-by-order)).

The overlays anchor. The title starts with the video, the tagline after the title, the lower third with `close`, the
call to action with `outro`. Move the close and the lower third follows; no overlay has an absolute time
([Overlays anchor](./time#overlays-anchor)).

The push-in is four `<Keyframe>` children on `broll`, so an editor can change one key
([Children for collections](./the-file#children-for-collections)).

`LowerThird` is a helper that returns a shape and two titles. It is used once, so its elements stay as editable as
any other ([Helpers](./the-file#helpers)).

The call to action is free code: a `<div>` with a progress bar inside `<Layer id="cta">`, timed by `useT()`. The Layer
holds one component, so an inspector can edit its `text` and `accent` props ([Free code](./free-code)).

The music bed starts at 0, runs to the end with `duration="fill"`, and ducks under the interview; the captions come
from the founder's words ([Captions and sound](./captions-and-sound)).

## What the player does with it

The resolver places everything: 29 elements with absolute start and end. The
player draws `main`'s clips on a canvas (bottom track first), the overlays as
DOM above it, the captions above those, and schedules the bed on Web Audio
with a gain envelope that ducks to 15 % under the two interview segments and
fades in and out. `data-el` on every DOM element and `data-time` on the root
let an editor find each element in the preview.

## How a drag becomes a diff

Drag the out edge of `hook` one word earlier. The timeline dispatches:

```ts
exec.execute({ type: "clip/trim", params: { id: "hook", edge: "out", value: "word:22.end" } });
```

`validate` checks the clip is unlocked and the value is inside the source;
`invert` records `clip/restoreTiming` with the old `out`; `apply` appends one
patch, `{ op: "set", id: "hook", prop: "out", value: "word:22.end" }`. The
resolver applies the net patches over the file: `hook` ends 0.6 s earlier,
`broll`, `demo`, `close` and `outro` move with it, the title anchored to
`start` does not, the lower third anchored to `close` does. The player repaints.

At the sync point, `foldToSource` turns the net patch into a source edit:

```diff
-        <Clip id="hook" src="asset:founder" in="word:12" out="word:23.end" />
+        <Clip id="hook" src="asset:founder" in="word:12" out="word:22.end" />
```

One token changes, and the example's test checks exactly that. Whoever reads the file next, you or the model, sees
what the drag did. [Editing](./editing) covers actions, undo and the fold in full.
