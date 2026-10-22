# cut

A video-editing DSL where a model writes a TSX file, the browser renders it as
the editor's preview, and the editor's timeline, inspector and preview gestures
edit that same file.

Packages:

- `packages/kit` (`@cut/kit`): the vocabulary, the resolver, the action system and
  the source tools. No renderer, no DOM, no UI. See `packages/kit/README.md`.
- `packages/player` (`@cut/player`): the browser player. WebCodecs decoding
  through mediabunny, canvas compositing, DOM overlays, a Web Audio clock and
  mixer, and the React `<Player>`. See `packages/player/README.md`.

```
pnpm install
pnpm check                            # typecheck, lint, tests
pnpm --filter @cut/player test:e2e    # browser tests (ffmpeg + Playwright Chromium)
```

CI runs the same `pnpm check` on every push and pull request. MIT licensed.
