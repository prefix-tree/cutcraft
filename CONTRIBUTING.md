# Contributing

Thanks for looking. CutCraft is small and opinionated; the fastest way to help is a
focused pull request with a test.

## Setup

- Node 22.19 or later (`.nvmrc`; the test runner's HTTP client needs it), pnpm 10 (`corepack enable` picks the pinned
  version).
- `pnpm install` also installs the git hooks (lefthook): before each commit Biome fixes and formats the staged files,
  and the commit summary must be a conventional one (below).
- `pnpm check` runs typecheck, lint and the test suites of every package. CI runs the same steps on Node 22 and 24,
  plus `pnpm knip` (unused files, dependencies and exports) and `pnpm check:packages` (each package packed as npm
  would get it, checked with publint and attw, after `pnpm build`).
- `pnpm fix` formats the code and applies lint fixes; `pnpm test:coverage` writes coverage reports. In VS Code, the
  recommended Biome extension formats on save.
- The export (`packages/render`) runs the player in headless Chrome. Its tests make their media with the system
  `ffmpeg` (`sudo apt-get install ffmpeg`), which needs the `drawtext` filter (FFmpeg built with libfreetype;
  Homebrew's `ffmpeg` may lack it), and read the exports back with `ffmpeg` and `ffprobe`. `pnpm --filter
  @cutcraft/render test` runs the parts that need no browser; `test:browser` runs the export itself, in the Chrome for
  Testing it downloads (or `CUTCRAFT_CHROMIUM`). `bench` measures frames per second.
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
| `packages/render` | the export: the page that runs the player in headless Chrome (`src/web`), the Chrome download, joining pieces, the audio mixer, smart copy, stills, the layout check and the CLI |
| `recipes` | complete cut files for common videos, linted, resolved and tested |
| `examples/launch-recap` | a file written by a model from a brief, played in the browser |
| `docs/` | the VitePress site: guides, generated reference, decision records |

## Adding a vocabulary element

1. Schema in `packages/kit/src/jsx/schemas/*.ts` (Zod, `strictObject`, defaults that validate). Add only props and
   values the player and the export draw: a file that checks clean should render as written.
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

- Strict TypeScript, no `any` in `src/`. Formatting is Biome's (`biome.jsonc`: two-space indent, double quotes,
  semicolons, 120 columns); don't format by hand. A lint rule that is wrong for a line gets a
  `// biome-ignore lint/<group>/<rule>: <why>` comment with a real reason.
- Commits follow conventional-commit summaries (`feat(kit): …`, `fix(player): …`, `perf: …`, `docs: …`); keep each commit focused.
- A pull request says what changed and why, lists the validation you ran, and includes before/after numbers for anything performance-related and screenshots for anything visual.
- Design choices are recorded as decision records in `docs/decisions/`. A change that reverses one adds a new record; it does not edit the old one.
- Claims in docs must be true of the code. If a feature is partial, say so.

## Changesets and releases

A pull request that changes what a published package does for its users adds a changeset: `pnpm changeset`, then
pick the packages, the size and a sentence for the changelog ([.changeset/README.md](.changeset/README.md)). CI asks
for one when a package changed; for a change users do not see, `pnpm changeset --empty`. All published packages share
one version. A release is a version pull request (`pnpm changeset version`) and then a `vX.Y.Z` tag on `main`, which
starts the **Release** workflow (`.github/workflows/release.yml`) and publishes through npm trusted publishing;
[.changeset/README.md](.changeset/README.md) lists the steps.

## Publishing the docs

The `docs` workflow deploys the site to GitHub Pages on every push to `main`.
It needs Pages enabled for the repository with "GitHub Actions" as the source.

## Benchmarks

Benchmarks run only on request. `gh workflow run ci.yml` runs the export
benchmark (`pnpm --filter @cutcraft/render bench`, on one page and on four) on a
4-core runner, with results in the job log and the `render-bench` artifact.
`gh workflow run docs.yml -f bench=true` measures the landing page's editor
number again before deploying. Otherwise the site uses the committed
`docs/bench.json`.

