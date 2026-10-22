# @cut/kit

The shared core of the cut editor: the JSX vocabulary a model writes, the
resolver that turns a file into absolute placements, the invertible action
system the editor dispatches, and the source tools that write those actions
back into the file.

The design is in [`docs/spec.md`](docs/spec.md). The mapping to OpenReel's action
set is in [`docs/parity.md`](docs/parity.md) (`pnpm parity` regenerates it).

## The file

```tsx
import { z } from "zod";
import { Clip, Composition, Title, Track, Transition } from "@cut/kit";

export const schema = z.object({ title: z.string(), accent: z.string() });
export const defaults = { title: "Why we built it", accent: "#ff5a1f" };

export default function Video({ title, accent }: z.infer<typeof schema>) {
  return (
    <Composition fps={30} width={1920} height={1080}>
      <Track id="main">
        <Clip id="c1" src="asset:interview" in="word:3" out="word:18" />
        <Transition id="x1" type="crossfade" duration={0.5} />
        <Clip id="c2" src="asset:city" duration={4} fit="cover" />
      </Track>
      <Track id="overlays">
        <Title id="t1" anchor="c1" offset={1} duration={3} color={accent}>{title}</Title>
      </Track>
    </Composition>
  );
}
```

Conventions the lint enforces: every element has a literal `id`; values a
human may edit are literals or `schema` props; helpers are pure; a sequence
track derives `start` from order (use `layout="free"` for absolute starts);
`in`/`out` may reference the asset manifest (`word:N`, `shot:N.end`,
`silence:N`, `marker:ID`).

## The pipeline

```
file.tsx ──evaluate──▶ element tree ──collect──▶ CollectedTree ──resolve(manifest, patches)──▶ ResolvedState
   ▲                                                                                              │
   └── fold(patch log) ◀── Executor.execute(action) ◀── timeline / inspector / preview gestures ◀──┘
```

- `collect(element)` walks the React element tree, expands pure helpers, and
  indexes every vocabulary element by id. `collectModule(mod)` does it for an
  imported file.
- `resolve(tree, manifest, log?)` places everything: sequence cursors, gaps,
  transitions (overlap by their duration), anchors, `fill` and `match`
  durations, transcript references, multicam cuts. Errors are typed and
  attached to the element that caused them.
- `new Executor({ tree, manifest })` runs actions. Each handler has four faces:
  `validate`, `apply` (appends patches), `invert` (never null), `fold`. History
  groups gestures and auto-groups rapid same-target updates. `undo()` and
  `redo()` re-run inverses and originals through the same path.
- `buildSourceIndex(text)` maps ids to source ranges. `foldToSource(text, log, state)`
  turns the patch log's net effect into text edits: a trim becomes one changed
  token, an inserted element is printed in place, a generated element is baked
  into literals first.
- `lint(text, { manifest })` returns the file-contract diagnostics.

## Status

Skeleton. Every action in the spec is registered and round-trips through
undo/redo against `fixtures/sample.tsx` (which uses every element). Three
actions are validated stubs: `track/setLayout`, `nested/extract`,
`multicam/flatten`. `<Captions src>` does not yet generate children from the
transcript. There is no renderer: `useT()` throws until a Player installs one.

```
pnpm typecheck
pnpm lint
pnpm test          # vitest, node and jsdom
pnpm parity        # regenerate docs/parity.md
```
