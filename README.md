# cutcut

**The file is the video.** A model writes a TSX file. The browser renders it.
The editor's timeline, inspector and preview edit that same file. There is no
project document beside it, no tool catalog for the model, and no second
renderer for export.

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

Drag the end of `hook` in the timeline and the file changes by one token. The
b-roll moves with it, the title does not, the bed still fills to the end. The
model reads the new file and sees what you did.

## Why

Models are good at writing code and bad at driving a hundred tools. Editors are
good at direct manipulation and bad at explaining themselves to a model. cutcut
puts both on one artifact: a file in a fixed vocabulary with literal ids, so a
gesture can find its element and change one value, and a model can read the
result as the code it wrote. The reasoning behind each choice is in
[`docs/decisions`](docs/decisions/README.md).

## How it works

```
file.tsx ──evaluate──▶ element tree ──collect──▶ CollectedTree ──resolve(manifest, patches)──▶ ResolvedState ──▶ Player
   ▲                                                                                              │
   └── fold(patch log) ◀── Executor.execute(action) ◀── timeline / inspector / preview gestures ◀──┘
```

- **Vocabulary.** 26 elements with Zod schemas: tracks (magnetic sequence or
  free), clips with `in`/`out` by seconds or by transcript words and shots,
  transitions, titles, shapes, SVG, stickers, captions, markers, adjustment
  layers, masks, nested compositions, multicam, keyframes, effects, and
  `<Layer>` for arbitrary React.
- **Resolver.** Places everything absolutely from the file, the asset manifest
  and the patch log. Typed errors, memoised, about 1 µs per element per change.
- **Actions.** 124 editor actions with `validate`, `apply`, `invert` and
  `fold`; history with gesture grouping; every action undoes.
- **Source tools.** A source index, a fold that writes patches back as token
  edits, a bake for generated elements, a lint for the file contract.
- **Player.** WebCodecs decoding through mediabunny, one canvas for footage,
  DOM for overlays, Web Audio as the clock and mixer, deterministic
  `seekTo(t)`, a React `<Player>` and a framework-free `PlayerCore`.

## Try it

```
pnpm install
pnpm check                                     # typecheck, lint, every suite (kit 432, player 90, example 4)
pnpm --filter @cutcut/example-launch-recap gen    # placeholder footage via ffmpeg
pnpm --filter @cutcut/example-launch-recap dev    # http://localhost:5180
```

The example is a 25 s launch recap a model wrote from a brief under the
authoring prompt; [the guide](docs/guide/writing-files.md) explains every
choice in it, and `pnpm docs:dev` serves the full site.

## Packages

| package | what | docs |
|---|---|---|
| `packages/kit` | vocabulary, manifest and time references, resolver, patches and actions, source tools, lint. No DOM. | [README](packages/kit/README.md), [spec](packages/kit/docs/spec.md) |
| `packages/player` | the browser renderer and the React `<Player>` | [README](packages/player/README.md) |
| `examples/launch-recap` | the worked example: brief, prompt, manifest, file, runnable page | [README](examples/launch-recap/README.md) |
| `recipes` | seven complete cut files for the videos cutcut is made for, each linted, resolved and tested | [docs](docs/recipes/index.md) |
| `docs` | guides, generated reference, decision records (VitePress) | `pnpm docs:dev` |

## Status

| | |
|---|---|
| Works | resolve, every action with undo, fold and bake, lint; playback with seek, rate, loop, crossfades, keyframed transforms, masks, DOM overlays, captions, ducking; the example end to end |
| Partial | transition types other than crossfade draw as crossfade; effects without a CSS filter equivalent, LUTs, matte masks, audio effects and reversed audio warn and are skipped |
| Planned | the editor package (timeline, inspector, preview gestures over the action set); headless export driving the same player; the agent-facing skill and a `cut lint` CLI; npm publishing |

## Contributing

Read [CONTRIBUTING.md](CONTRIBUTING.md). CI runs `pnpm check`, the browser
suite and the docs build on every push and pull request.

## License

[MIT](LICENSE).
