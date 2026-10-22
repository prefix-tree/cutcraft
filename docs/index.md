---
layout: home
hero:
  name: cut
  text: The file is the video.
  tagline: A model writes a TSX file. The browser renders it. The editor's timeline, inspector and preview edit that same file. No project document, no tool catalog, no second renderer.
  actions:
    - theme: brand
      text: Writing a file
      link: /guide/writing-files
    - theme: alt
      text: Getting started
      link: /guide/getting-started
    - theme: alt
      text: Decisions
      link: /decisions/
features:
  - title: One artifact, three authors
    details: The model reads and rewrites the file. Gestures become actions, actions become patches, patches fold back into the file as one-token edits. Everyone sees the same thing.
  - title: A vocabulary the editor can address
    details: 26 elements with Zod schemas, literal ids on everything, magnetic sequence tracks, anchors, and time references that trim by transcript words and shots.
  - title: The browser renders
    details: WebCodecs through mediabunny, one canvas for footage, DOM for overlays, Web Audio as the clock. seekTo(t) draws the exact frame, so export is the same player, headless.
---

## The pipeline

```
file.tsx ──evaluate──▶ element tree ──collect──▶ CollectedTree ──resolve(manifest, patches)──▶ ResolvedState ──▶ Player
   ▲                                                                                              │
   └── fold(patch log) ◀── Executor.execute(action) ◀── timeline / inspector / preview gestures ◀──┘
```

## A file

```tsx
export const schema = z.object({ product: z.string(), accent: z.string() });
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
        <Title id="title" anchor="start" offset={0.4} duration={2.8} color={accent}>{product}</Title>
      </Track>
      <Track id="music" layout="free">
        <Audio id="bed" src="asset:music" start={0} duration="fill" volume={0.35} duck={{ under: "main", to: 0.15 }} />
      </Track>
    </Composition>
  );
}
```

Drag the end of `hook` in the timeline and the file changes by one token:
`out="word:23.end"` becomes `out="word:22.end"` or `out={9.5}`. The b-roll
moves with it, the title does not, the bed still fills to the end.
