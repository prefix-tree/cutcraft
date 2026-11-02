# Contributing

Thanks for looking. CutCraft is small and opinionated; the fastest way to help is a
focused pull request with a test.

## Setup

- Node 22.19 or later (`.nvmrc`; the test runner's HTTP client needs it), pnpm 10 (`corepack enable` picks the pinned
  version).
- `pnpm install`, then `pnpm check` runs typecheck, lint and the test suites of
  every package. CI runs the same command.
- The export (`packages/render`) loads native binaries (`skia-canvas`, `node-av` with
  its FFmpeg) with the install; its tests make their media with the system `ffmpeg`
  (`sudo apt-get install ffmpeg`), which needs the `drawtext` filter (FFmpeg built with libfreetype; Homebrew's
  `ffmpeg` may lack it). `pnpm --filter @cutcraft/render test:browser` also
  needs Playwright's Chromium, and `bench` measures frames per second.
- Browser tests: `pnpm --filter @cutcraft/player test:e2e` needs `ffmpeg` on the
  path and Playwright's Chromium (`pnpm exec playwright install --with-deps chromium`
  from `packages/player`). They generate their media on first run.
- Docs: `pnpm docs:dev` serves the site; `pnpm docs:gen` regenerates the
  reference pages from the code and must leave `git diff` empty (CI checks).
- The example: `pnpm --filter @cutcraft/example-launch-recap gen` then `dev`.

## Where things live

| | |
|---|---|
| `packages/kit` | vocabulary (`src/jsx`), manifest and time references (`src/manifest`), resolver (`src/resolve`), patches and actions (`src/patches`, `src/actions`), source tools and lint (`src/source`) |
| `packages/graphics` | the `<Graphic>` kinds (`src/kinds`), one `defineKind` each: a zod prop schema, a size and a pure `draw`; `graphicControls` reads a schema into editor controls |
| `packages/player` | pure model (`src/model`), decoding (`src/media`), compositing (`src/render`), audio (`src/audio`), `PlayerCore` and the React surface (`src/react`) |
| `packages/render` | the Node export: frame pipeline, overlay plane (Satori and skia), encoder, audio mixer, workers, stills and the layout check |
| `recipes` | complete cut files for common videos, linted, resolved and tested |
| `examples/launch-recap` | a file written by a model from a brief, played in the browser |
| `docs/` | the VitePress site: guides, generated reference, decision records |

## Adding a vocabulary element

1. Schema in `packages/kit/src/jsx/schemas/*.ts` (Zod, `strictObject`, defaults where OpenReel has them).
2. Capabilities row in `src/jsx/capabilities.ts`; the component in `src/jsx/elements.ts`.
3. Placement rules in `src/resolve/resolve.ts` if it is timed; lint rules in `src/source/lint/rules` if it has conventions.
4. Use it in `fixtures/sample.tsx`, regenerate `fixtures/sample.placement.json` with `pnpm exec tsx scripts/gen-placement.ts`, and add the resolve assertions.
5. Render it in the player: a draw op in `src/model/frame-plan.ts` for canvas kinds, or a component in `src/react/elements` for DOM kinds.
6. `pnpm docs:gen` to update the element reference.

## Adding an action

1. Params type in `src/actions/types/index.ts`; add it to `AUTO_GROUP_TYPES` if a drag produces it.
2. Handler in `src/actions/handlers/*.ts` with all four faces; `invert` is never null.
3. A row in `test/handlers/cases.ts` so the round-trip test covers it, plus a focused test if timing is involved.
4. A row in `scripts/parity.ts` and `pnpm parity`.

## Conventions

- Strict TypeScript, no `any` in `src/`, two-space indent, double quotes, semicolons.
- Commits follow conventional-commit summaries (`feat(kit): …`, `fix(player): …`, `perf: …`, `docs: …`); keep each commit focused.
- A pull request says what changed and why, lists the validation you ran, and includes before/after numbers for anything performance-related and screenshots for anything visual.
- Design choices are recorded as decision records in `docs/decisions/`. A change that reverses one adds a new record; it does not edit the old one.
- Claims in docs must be true of the code. If a feature is partial, say so.

## Publishing the docs

The `docs` workflow deploys the site to GitHub Pages on every push to `main`.
It needs Pages enabled for the repository with "GitHub Actions" as the source.
