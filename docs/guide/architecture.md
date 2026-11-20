# Architecture

UberScene is six npm packages and one experimental native binary. [How it fits together](./introduction#how-it-fits-together)
shows the path from a file to a picture. This page goes one level down: what each package holds, where it runs, what
it depends on, and where in the repository to make a change. Read it before you change UberScene itself.

## The packages

| Package | Holds | Runs in |
|---|---|---|
| `@uberscene/kit` | What a file imports: the elements, the ready-made components, the free-code hooks and helpers, the theme, and the vocabulary as data (`@uberscene/kit/schema`). It doesn't place, edit or draw anything. | anywhere |
| `@uberscene/sdk` | What a tool imports: `loadModule`, the resolver, the `Executor` and its actions, the patch log, `foldToSource` and the lint. | browser or Node, no DOM |
| `@uberscene/player` | Plays a resolved file: decoders, compositor, painter, overlays, sound and clock. `@uberscene/player/engine` is the part without a DOM. | browser |
| `@uberscene/graphics` | three.js and Motion on the video's clock, for `<Three>`, `<Motion>` and free code. | browser |
| `@uberscene/render` | The export: loads the file in Node, serves it to headless Chrome, runs the player there and joins what it encodes. The command line lives here too (`@uberscene/render/cli`). | Node and Chrome |
| `uberscene` | The command line people install, a thin wrapper over `@uberscene/render/cli` ([CLI](/reference/cli)). | Node |
| `native/` | `uberscene-codec`, a Rust codec process the export can use instead of Chrome's codecs ([Native codecs](./native-codecs)). Not on npm yet. | native |

## What depends on what

```text
kit ◄── sdk ◄── player ◄── render ◄── uberscene
 ▲                           │
 └──────── graphics ◄────────┘
```

Dependencies run one way. The SDK and graphics build on the kit, the player on the SDK, and the export on the player
and graphics. The kit and the SDK never touch the DOM, so a server can resolve, lint and edit a file without a browser.
Only drawing needs one, which is why the export brings its own.

## Where to make a change

| To change | Look in |
|---|---|
| What a file may write: a prop, an element, an effect | `packages/kit/src/jsx/schemas`, `packages/kit/src/components` |
| Where an element lands in time | `packages/sdk`, the resolver |
| An edit an editor runs | `packages/sdk`, the actions |
| How a frame is drawn | `packages/player/src/model` (the plan) and `packages/player/src/render` (the painter) |
| How sound is mixed | `packages/player/src/model/audio-plan.ts` and `packages/player/src/audio` |
| How the export runs | `packages/render` |
| The native codecs | `native/` and `native/PROTOCOL.md` |

[Core principles](./principles) lists the choices every package keeps to, with the decision record behind each.

## Next

- [How the player draws](./how-the-player-draws): from the resolved file to one frame.
- [How the export works](./export-architecture): the player in headless Chrome, and how the pieces join.
- [Native codecs](./native-codecs): the experimental Rust decoder and encoder.
- [Decision records](/decisions/): why each part is built the way it is.
