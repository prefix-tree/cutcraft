# Getting started

You need Node 22.19 or later, pnpm 10 (`corepack enable` picks the pinned version), and `ffmpeg` for the generated
footage. The launch-recap example's footage also needs ffmpeg's `drawtext` filter, which some builds (Homebrew's, for
one) leave out; the showcase's footage does not.

```sh
git clone https://github.com/prefix-tree/cutcraft && cd cutcraft
pnpm install
pnpm check                                        # typecheck, lint, every test suite
pnpm --filter @cutcraft/example-launch-recap gen    # placeholder footage
pnpm --filter @cutcraft/example-launch-recap dev    # http://localhost:5180
```

The example plays a file a model wrote from a brief; the page shows the lint
result, the resolve result and a tweaks form bound to the file's `schema`.
[Writing a file](./writing-files.md) walks through it.

## Rendering the examples

The videos on the [examples page](../examples) are files in `examples/showcase`. Make their footage and render them:

```sh
pnpm --filter @cutcraft/example-showcase gen       # footage from ffmpeg's own sources
pnpm --filter @cutcraft/example-showcase render    # WebM and a poster each, into docs/public/showcase
pnpm docs:bench                                  # the benchmarks on the home page, for your machine
```

## Exporting a file

The renderer's CLI exports any cut file in Node, with no browser; [Exporting](./exporting.md) lists every option.

```sh
npm install cutcraft @cutcraft/kit react   # in your project; the file imports @cutcraft/kit
npx cutcraft video.tsx --out video.mp4    # or .webm, .mov, .mp3, .wav
npx cutcraft video.tsx --still 2 --out poster.png
npx cutcraft video.tsx --check-layout --safe-zone tiktok
```

## Using the kit

```ts
import { collectModule, resolve, Executor } from "@cutcraft/kit";
import { lint, foldToSource } from "@cutcraft/kit/source";
import * as file from "./video";

const state = resolve(collectModule(file), manifest);      // absolute placements by id
const diagnostics = lint(text, { manifest });              // the file contract
const exec = new Executor({ tree: collectModule(file), manifest });
exec.execute({ type: "clip/trim", params: { id: "hook", edge: "out", value: 9.5 } });
const { text: edited } = foldToSource(text, exec.log(), exec.state());
```

## Using the player

```tsx
import { Player } from "@cutcraft/player";

<Player state={state} element={file.default(file.defaults)} media={{ founder: blob, music: "/music.ogg" }} controls />
```

`media` maps asset ids to Blobs or URLs. `element` is only needed for
`<Layer>` interiors. The framework-free `PlayerCore` has the same surface
without React; see [Rendering](./rendering.md).

## Packages

| | |
|---|---|
| `@cutcraft/kit` | vocabulary, manifest and time references, resolver, patches and actions, source tools and lint. No DOM. |
| `@cutcraft/player` | WebCodecs decoding through mediabunny, canvas compositing, DOM overlays, Web Audio clock and mixer, `<Player>`. |

Both are on npm: `npm install @cutcraft/kit @cutcraft/player react react-dom`.
