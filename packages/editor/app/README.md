# The shadcn editor's demo

The editor in `../registry`, put together in a Vite app with [shadcn/ui](https://ui.shadcn.com) (Tailwind v4, the
radix-nova preset). It is the demo the docs site serves at `/editor/` and the end-to-end test bed for editing.

```sh
pnpm --filter @uberscene/editor-app dev        # http://localhost:5181
pnpm --filter @uberscene/editor-app test:e2e   # PLAYWRIGHT_CHROMIUM=<path> to use a Chromium of your own
```

- `src/main.tsx` makes one executor over `video.tsx` (a titles-only file, so no media) and renders `VideoEditor`.
  In every build it also sets `window.__editor`, which the tests read: the executor, the file as the edits leave it,
  the actions run, and `replay()`, which runs them through a fresh executor straight to the SDK.
- The editor's parts are imported from `../registry/editor` through the `@/registry` alias, and Tailwind reads their
  classes from there (`@source` in `src/index.css`). Nothing is copied: what `shadcn add` installs is what runs here.
- `src/components/ui` holds the shadcn components as `npx shadcn add` wrote them.
- `e2e/editor.e2e.ts`: each test edits with the pointer or the keyboard, then checks the file's text and that the SDK
  writes the same file from the same actions.
