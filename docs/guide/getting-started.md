# Getting started

```
git clone https://github.com/bsnisar/cut && cd cut
pnpm install
pnpm check                                     # typecheck, lint, every test suite
pnpm --filter @cut/example-launch-recap gen    # placeholder footage (needs ffmpeg)
pnpm --filter @cut/example-launch-recap dev    # http://localhost:5180
```

The example plays a file a model wrote from a brief; the page shows the lint
result, the resolve result and a tweaks form bound to the file's `schema`.
[Writing a file](./writing-files.md) walks through it.

## Using the kit

```ts
import { collectModule, resolve, Executor } from "@cut/kit";
import { lint, foldToSource } from "@cut/kit/source";
import * as file from "./video";

const state = resolve(collectModule(file), manifest);      // absolute placements by id
const diagnostics = lint(text, { manifest });              // the file contract
const exec = new Executor({ tree: collectModule(file), manifest });
exec.execute({ type: "clip/trim", params: { id: "hook", edge: "out", value: 9.5 } });
const { text: edited } = foldToSource(text, exec.log(), exec.state());
```

## Using the player

```tsx
import { Player } from "@cut/player";

<Player state={state} element={file.default(file.defaults)} media={{ founder: blob, music: "/music.ogg" }} controls />
```

`media` maps asset ids to Blobs or URLs. `element` is only needed for
`<Layer>` interiors. The framework-free `PlayerCore` has the same surface
without React; see [Rendering](./rendering.md).

## Packages

| | |
|---|---|
| `@cut/kit` | vocabulary, manifest and time references, resolver, patches and actions, source tools and lint. No DOM. |
| `@cut/player` | WebCodecs decoding through mediabunny, canvas compositing, DOM overlays, Web Audio clock and mixer, `<Player>`. |

Neither is published to npm yet; the workspace is the way to use them.
