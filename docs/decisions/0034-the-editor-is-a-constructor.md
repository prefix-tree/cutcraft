# 0034. The editor is a constructor of building blocks; its styling is a shadcn registry

> Status: proposed. Builds on `@uberscene/editor`, which ships `<Editor.Root>`, `Preview`, `Controls`, `Layers` and
> `Timeline` as unstyled parts around one player.

## Context

`@uberscene/editor` lets a page place editor parts anywhere under one `<Editor.Root>`: one player, one selection, and
undoable edits through the sdk's `Executor`. The parts render fixed, unstyled markup marked with `data-editor-*`
attributes. A page can restyle that markup with CSS, but it can't restructure it: a timeline with thumbnails, a
layers panel with visibility toggles, or a transport bar laid out differently all mean rewriting the part.

People who embed an editor want it to look like their own product. Many React apps already build their UI from
[shadcn/ui](https://ui.shadcn.com). shadcn is not a package an app depends on. It is a registry of component
source that `npx shadcn add` copies into the app, which then owns and edits it. Any registry can be added by URL.

Two shapes were weighed:

- **A styled npm package** (Tailwind and Radix inside `@uberscene/editor`, or a sibling `editor-ui`). It looks good
  on install, but it puts Tailwind on everyone, and restyling it hits the same wall as today, just further out.
- **Headless hooks plus a registry.** The package keeps behaviour and state. The look is source the app owns.

## Decision

**The editor is a constructor.** `@uberscene/editor` is a set of small building blocks that an app puts together into
its own editor. React context carries the state down and hooks read it, so a block placed anywhere under
`<Editor.Root>`, at any depth and inside the app's own components, knows its player, its selection, its track and
its clip. The package keeps behaviour and state and has no look.

- **Every part is a compound of smaller blocks**, and each scope has its own context:

  ```tsx
  <Editor.Root executor={executor} media={media}>
    <Editor.Timeline.Root>
      <Editor.Timeline.Tracks>                      {/* maps tracks; provides TrackContext */}
        {(track) => (
          <MyTrackRow>
            <Editor.Timeline.Clips>                 {/* maps the track's clips; provides ClipContext */}
              {(clip) => <MyClip />}                {/* MyClip calls useClip(): row, left, width, selected, select() */}
            </Editor.Timeline.Clips>
          </MyTrackRow>
        )}
      </Editor.Timeline.Tracks>
      <Editor.Timeline.Playhead />
    </Editor.Timeline.Root>
  </Editor.Root>
  ```

  The same applies to `Layers` (`Root`, `Groups`, `Items`, with `useLayerGroup()` and `useLayerItem()`) and to the
  transport (`PlayButton`, `Scrubber`, `Time`, `Mute`, `Rate`, with `usePlayback()`).
- **A hook for every scope:** `useEditor()`, `useSelection()`, `useEdit()`, `usePlayback()`, `useTimeline()`,
  `useTrack()`, `useClip()`, `useLayers()`, `useLayerItem()`. A hook used outside its block throws an error that
  names the block it needs.
- **Blocks render one element or none.** Each one takes `asChild` or a render function, so the app picks the element
  and its classes. A block never forces markup the app didn't ask for.
- **The current parts stay as presets.** `<Editor.Layers />` and `<Editor.Timeline />` become a default
  arrangement of the blocks, so code that uses them keeps working.
- The package keeps zero UI dependencies: no Tailwind, no Radix, no shadcn.

**A shadcn registry ships the styled editor.** The docs site serves `registry.json` and its built items under
`/r/` (for example `/r/editor.json`), so an app runs:

```sh
npx shadcn add https://uberscene.prefixtree.xyz/r/editor
```

and gets `components/editor/{editor-shell,layers,timeline,transport}.tsx`. They are built from shadcn's Button,
Slider, ScrollArea, ResizablePanelGroup, Tooltip and ToggleGroup, are arrangements of the blocks above, and list
`@uberscene/editor` as a dependency. Each part is also its own registry item, so an app can take only the timeline.

**A demo app shows and tests it.** The docs site is VitePress (Vue) and can host the JSON but not render the React
components, so `examples/editor` (Vite, React, Tailwind, shadcn) installs the registry from the workspace and is
where the styled editor is seen and tested.

## Consequences

- An app that uses shadcn gets an editor that looks like the rest of its UI, and owns the code to change it.
- An app that doesn't use shadcn builds from the blocks and hooks, or uses the presets, with no UI dependency forced
  on it.
- Customising means replacing one block, not forking a part: a clip with a thumbnail is a component that calls
  `useClip()`.
- Registry components are copied, so a fix there doesn't reach apps that already added them. Behaviour lives in the
  blocks and hooks, which do update with the package, so the copied files should stay thin.
- New upkeep: the registry source, `shadcn build` in the docs build, and the demo app. The repo has no Tailwind or
  shadcn today.
- Open: whether `shadcn build` runs cleanly inside this pnpm workspace, and how registry items should pin the
  `@uberscene/editor` version.
