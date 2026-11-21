# The shadcn editor

A video editor for an UberScene file, built from [shadcn/ui](https://ui.shadcn.com) components. Like any shadcn
component, it is not a package your app depends on: `npx shadcn add` copies its source into your app, and from then on
the files are yours to change.

<p><a href="/editor/" target="_self">Try the editor →</a> Drag a bar on the timeline, then open the Source tab: the file
has changed by the one value you dragged.</p>

::: warning Work in progress
The editor installs from the registry today, but the packages it imports (`@uberscene/editor`, `@uberscene/sdk`) reach
npm with the next release. Until then it runs inside the UberScene repository.
:::

## What you get

```sh
npx shadcn add https://uberscene.prefixtree.xyz/r/editor.json
```

This writes `components/editor/` into your app, adds the shadcn components it is built from (button, slider,
resizable, tabs, select and a few more), and installs `@uberscene/editor`, `@uberscene/player` and `@uberscene/sdk`.

| File | Part | What it does |
|---|---|---|
| `editor.tsx` | `editor` | The whole editor: layers, the picture and its transport, the inspector, then the timeline and the file in tabs. Keyboard shortcuts. |
| `timeline.tsx` | `editor-timeline` | A row per track and a bar per element. Click to select, drag to move, drag an end to trim. Each drag is one undoable edit. |
| `layers.tsx` | `editor-layers` | Every element, grouped by track. A click selects it. |
| `transport.tsx` | `editor-transport` | Play and pause, a scrubber, the time, the speed and mute. |
| `inspector.tsx` | `editor-inspector` | The selected element's timing, text and every prop its schema lists, as fields. A prop written as code in the file shows locked. |
| `source.tsx` | `editor-source` | The file with every edit written in, the changed lines marked, to copy or download. |

Each part is its own item, so you can take one: `npx shadcn add https://uberscene.prefixtree.xyz/r/editor-timeline.json`
gives you the timeline alone.

## Put it in a page

```tsx
import { buildSourceIndex, collectModule, Executor } from "@uberscene/sdk";
import "@uberscene/player/fonts.css";

import { VideoEditor } from "@/components/editor/editor";
import * as file from "./video";
import source from "./video.tsx?raw";

// The source index tells the editor which props are written as code, so it shows them locked.
const executor = new Executor({
  tree: collectModule(file, {}, { index: buildSourceIndex(source) }),
  manifest: { assets: {} },
});

export function App() {
  return <VideoEditor executor={executor} source={source} element={file.default()} />;
}
```

`media` takes the footage by asset id (a `Blob` or a URL), as the [player](./player) does. The demo's file is all
titles, so it needs none.

| Key | Does |
|---|---|
| Space | Play and pause. |
| Cmd/Ctrl+Z, Shift+Cmd/Ctrl+Z | Undo, redo. |
| Delete | Remove the selection. |
| Left, Right | Move the selection by a frame; with Shift, by a second. |

## Make it yours

The files are plain React and Tailwind, so change them as you would any component in your app: restyle the bars, put
the inspector in a sheet, add a column of thumbnails. What they do comes from two places that stay in npm, so a fix
there reaches you without copying anything again:

- **`@uberscene/editor`**: `<Editor.Root>` holds one player, one selection and the edit history for every part
  inside it. `useSelection()`, `useEdit()` and `useEditor()` read them from any depth.
- **`@uberscene/sdk`**: the actions every edit runs, the resolver that places each element in time, and the fold
  that writes the edits back into the file's text. [Editing](./editing) explains all three.

Keep that split when you change a part: put a new gesture's logic in an action, and keep the component to what is
drawn. To build an editor without shadcn, use `<Editor.Root>`, its unstyled `Preview`, `Layers` and `Timeline`, and
the hooks; the [package README](https://github.com/prefix-tree/uberscene/tree/main/packages/editor) lists them.

## The demo is the test bed

The editor's source lives in `packages/editor/registry`, and the demo in `packages/editor/app` imports it from there,
so what you install is what runs at <a href="/editor/" target="_self">/editor/</a> and what is tested. Each end-to-end test makes
an edit with the pointer or the keyboard, reads the file it leaves, and runs the same actions through the SDK with no
editor around it, to check both write the same file. The tests found two bugs in the SDK before this page was written.

## Next

- [Editing](./editing): the actions, the patch log and the fold the editor is built on.
- [Player](./player): the player the editor's preview is.
