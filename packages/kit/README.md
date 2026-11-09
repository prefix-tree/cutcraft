<p align="center"><img src="https://raw.githubusercontent.com/prefix-tree/cutcraft/main/docs/public/logo.svg" width="64" alt="CutCraft"></p>

# @cutcraft/kit

The core of [CutCraft](https://cutcraft.prefixtree.xyz/): the elements a video file is written in, the resolver
that turns a file into exact placements, the actions an editor runs on it, and the tools that write those edits back
into the file's text. It has no DOM and runs anywhere.

```sh
npm install @cutcraft/kit react zod
```

## A file

```tsx
import { z } from "zod";
import { Clip, Composition, Title, Track, Transition } from "@cutcraft/kit";

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
        <Title id="t1" anchor="c1" offset={1} duration={3} color={accent}>{title}</Title>
      </Track>
    </Composition>
  );
}
```

`in` and `out` can point into the asset manifest (`word:N`, `shot:N.end`, `silence:N`, `marker:ID`), so a cut stays on
its word when the clip moves. Each timeline element has a literal `id`. A track is a magnetic sequence unless it says
`layout="free"`. A `<Layer>` holds any React you like.

## Using it

```ts
import { collectModule, resolve, Executor } from "@cutcraft/kit";
import { lint, foldToSource } from "@cutcraft/kit/source";
import * as file from "./video";

const state = resolve(collectModule(file), manifest);      // every element placed in time, by id
const diagnostics = lint(text, { manifest });              // problems in the file, at their line

const exec = new Executor({ tree: collectModule(file), manifest });
exec.execute({ type: "clip/trim", params: { id: "c1", edge: "out", value: 9.5 } });
exec.undo();
const { text: edited } = foldToSource(text, exec.log(), exec.state());   // the edit as a text change
```

| | |
|---|---|
| `collectModule(mod)`, `resolve(tree, manifest, log?)` | Read a file and place everything in it: sequences, gaps, transitions, anchors, `fill` and `match` durations, transcript references and multicam cuts. Errors are typed and point at the element that caused them. A change costs about 2 µs per element, and placements that did not change keep their identity, so a UI can memoise on them. |
| `Executor` | Runs 131 editor actions (trim, split, move, ripple, keyframes, captions and more). Each one validates, applies and undoes; history groups a drag into one step. |
| `@cutcraft/kit/source` | `loadModule(source, { imports })` evaluates a file's text in the browser or in Node; the file may import `react`, `zod` and the kit, plus the modules you pass in `imports`. `buildSourceIndex` maps ids to their place in the text, `foldToSource` writes edits back as small token changes, and `lint` checks the file. |
| `interpolate`, `spring`, `random` | Pure animation helpers for free code. `useT()` and `useLayer()` give the current time once a player is mounted. |

The kit doesn't draw anything. [`@cutcraft/player`](https://www.npmjs.com/package/@cutcraft/player) plays a resolved
file in the browser, and [`cutcraft`](https://www.npmjs.com/package/cutcraft) exports it.

## Docs

- [The file](https://cutcraft.prefixtree.xyz/guide/the-file) and [Time by meaning](https://cutcraft.prefixtree.xyz/guide/time)
- [Editing](https://cutcraft.prefixtree.xyz/guide/editing)
- [Elements](https://cutcraft.prefixtree.xyz/reference/elements/) and [actions](https://cutcraft.prefixtree.xyz/reference/actions)

MIT licensed.
