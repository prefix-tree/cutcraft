<p align="center"><img src="https://raw.githubusercontent.com/prefix-tree/uberscene/main/docs/public/logo.svg" width="64" alt="UberScene"></p>

# @uberscene/editor

## The shadcn editor

<p align="center">
  <img src="https://raw.githubusercontent.com/prefix-tree/uberscene/main/docs/public/readme/editor.webp" width="820" alt="The UberScene editor: layers, the preview, the inspector and a timeline">
</p>

A whole editor, built from [shadcn/ui](https://ui.shadcn.com) components on the parts below, installs into your app
as source you own:

```sh
npx shadcn add https://uberscene.prefixtree.xyz/r/editor.json
```

[The shadcn editor](https://uberscene.prefixtree.xyz/guide/editor) has what it gives and how to make it yours, and
[the demo](https://uberscene.prefixtree.xyz/editor/) runs it. Its source is in `registry/` and the demo in `app/`.

## The parts

Editor parts for a [UberScene](https://uberscene.prefixtree.xyz/) video that share one player. Put each one wherever
your layout wants it.

```sh
npm install @uberscene/editor @uberscene/player @uberscene/sdk @uberscene/kit react react-dom
```

```tsx
import { collectModule, Executor } from "@uberscene/sdk";
import { Editor } from "@uberscene/editor";
import "@uberscene/player/fonts.css";
import * as file from "./video";

const executor = new Executor({ tree: collectModule(file), manifest });

<Editor.Root executor={executor} media={{ interview: blob }}>
  <aside><Editor.Layers /></aside>
  <main>
    <Editor.Preview element={file.default(file.defaults)} />
    <Editor.Controls />
  </main>
  <footer><Editor.Timeline /></footer>
</Editor.Root>
```

Pass `state` instead of `executor` for a read-only editor.

### Parts

- `Editor.Root`: one player and one selection for everything inside. It takes the player's props (`media`, `loop`, …).
- `Editor.Preview`: the picture. A click selects the overlay under the pointer.
- `Editor.Controls`: play/pause, scrubber, time, mute, speed.
- `Editor.Layers`: every element grouped by track. A click selects it.
- `Editor.Timeline`: a row per track and a bar per element, with the playhead. A bar click selects the element and seeks to it.

### Hooks

- `useSelection()`: `[id, select]`. Use it to build an inspector.
- `useEdit()`: `execute(action)`, `undo()`, `redo()`, `canUndo`, `canRedo`, through the Root's executor.
- `usePlayer()` and `useCompositionTime()` from `@uberscene/player` work anywhere inside the Root.

The parts are unstyled. Style them through their `data-editor-*` attributes; `aria-pressed` marks the selection.
