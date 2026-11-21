# Editor example: `@uberscene/editor` with shadcn/ui

A video editor put together from `@uberscene/editor`'s parts and hooks and styled with
[shadcn/ui](https://ui.shadcn.com) (Tailwind v4, the radix-nova preset).

```sh
pnpm --filter @uberscene/example-editor dev   # http://localhost:5181
```

`video.tsx` is a titles-only file, so the example needs no media.

## How it's built

`<Editor.Root executor={executor}>` owns the player, the selection and the edit history. Everything inside is either
an editor part or a block of our own that reads the editor through hooks:

| Block | File | Uses |
|---|---|---|
| Preview | `Editor.Preview` | the player's picture |
| Layers | `src/components/editor/layers.tsx` | `useSelection()`, shadcn `ScrollArea` and `Button` |
| Transport | `src/components/editor/transport.tsx` | `usePlayer()`, `useCompositionTime()`, shadcn `Slider` |
| Timeline | `src/components/editor/timeline.tsx` | `useSelection()`, `usePlayer()`, `useCompositionTime()` |
| Inspector | `src/components/editor/inspector.tsx` | `useEdit()` for nudge, remove, undo and redo; shadcn `Card` and `Badge` |

`useRows()` (`src/components/editor/use-rows.ts`) groups the sdk's `timelineRows()` by track for the layers and the
timeline. The layout is shadcn's `Resizable`. `src/components/ui` holds shadcn components as `npx shadcn add` wrote
them.

Decision record [0034](../../docs/decisions/0034-the-editor-is-a-constructor.md) plans to move these blocks into the
package as compound parts and ship this styling as a shadcn registry.
