# cut

A video-editing DSL where a model writes a TSX file, the browser renders it as
the editor's preview, and the editor's timeline, inspector and preview gestures
edit that same file.

Packages:

- `packages/kit` (`@cut/kit`): the vocabulary, the resolver, the action system and
  the source tools. No renderer, no DOM, no UI. See `packages/kit/README.md`.

```
pnpm install
pnpm check        # typecheck, lint, tests
```

CI runs the same `pnpm check` on every push and pull request. MIT licensed.
