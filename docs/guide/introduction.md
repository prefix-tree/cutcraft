# Introduction

CutCraft edits video as code. A video is a TSX file: tracks of clips, transitions, captions and music, plus anything
you want to draw on top. The browser plays the file, an editor changes it, and Node exports it to MP4, WebM or MOV.

```tsx
export default function Video() {
  return (
    <Composition fps={30} width={1920} height={1080}>
      <Track id="main">
        <Clip id="hook" src="asset:founder" in="word:12" out="word:23.end" />
        <Transition id="x1" type="crossfade" duration={0.4} />
        <Clip id="broll" src="asset:product" in="shot:1" out="shot:1.end" fit="cover" />
      </Track>
      <Track id="overlays">
        <Title id="title" anchor="hook" at="word:14" duration={2.8}>Shed</Title>
      </Track>
    </Composition>
  );
}
```

## Cuts on words, not seconds

`in="word:12"` starts the clip on the twelfth word of the interview's transcript. `in="shot:1"` starts it where the
camera's second shot begins. The title starts on word 14 of the clip that says it. CutCraft turns these into seconds
itself, through every trim and speed change.

This matters most when a language model writes the file. Models write code well and do arithmetic badly: a cut
written as `8.43` seconds can land in the middle of a word, and a cut written as `word:12` can't. It also helps people:
trim the clip and the title stays on its word.

## A timeline you can edit, pictures you can code

The timeline part of a file uses elements with literal ids, like `<Clip id="hook">`. When you drag the end of `hook`
in an editor, CutCraft finds that element and changes one value in the file:

```diff
-        <Clip id="hook" src="asset:founder" in="word:12" out="word:23.end" />
+        <Clip id="hook" src="asset:founder" in="word:12" out="word:22.end" />
```

The b-roll moves up behind it, and the title stays on its word. Whoever opens the file next, a person or a model,
reads the edit as ordinary code.

What you draw on top is up to you. A `<Layer>` holds any React component, with hooks, CSS 3D, canvas or WebGL, and
`<Three>` and `<Motion>` put three.js and Motion on the timeline. There is also a library of ready-made titles,
shapes and graphics for the common cases. [Free code](./free-code) explains how it all stays on the video's clock.

## What you get

| Package | What it does |
|---|---|
| [`cutcraft`](https://www.npmjs.com/package/cutcraft) | The command line: export a file to video, audio or a still, or check its layout. |
| [`@cutcraft/kit`](https://www.npmjs.com/package/@cutcraft/kit) | The elements, the resolver that places everything in time, 131 undoable editor actions, and the tools that write edits back into the file. |
| [`@cutcraft/player`](https://www.npmjs.com/package/@cutcraft/player) | A React `<Player>` and a framework-free `PlayerCore` for the browser. |
| [`@cutcraft/render`](https://www.npmjs.com/package/@cutcraft/render) | Export from your own code, in Node, with no browser. |
| [`@cutcraft/graphics`](https://www.npmjs.com/package/@cutcraft/graphics) | Ready-made graphics, and three.js and Motion on the video's clock. |

[Quick start](./getting-started) takes you from `npm install` to an exported file. [Examples](/examples) shows
rendered videos next to the files that made them.
