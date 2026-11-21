<p align="center"><img src="https://raw.githubusercontent.com/prefix-tree/uberscene/main/docs/public/logo.svg" width="64" alt="UberScene"></p>

# @uberscene/sdk

What an [UberScene](https://uberscene.prefixtree.xyz/) tool is built with: the resolver that turns a video file into
exact placements, the actions an editor runs on it, the patch log, the write-back to the file's text, the lint and the
inspection rows. It has no DOM and runs in the browser or in Node.

```sh
npm install @uberscene/sdk @uberscene/kit react zod
```

A video file imports [`@uberscene/kit`](https://www.npmjs.com/package/@uberscene/kit); a tool that reads, checks or
edits that file imports this package.

## Using it

```ts
import { collectModule, Executor, foldToSource, lint, resolve } from "@uberscene/sdk";
import * as file from "./video";

const state = resolve(collectModule(file), manifest);      // every element placed in time, by id
const diagnostics = lint(text, { manifest });              // problems in the file, at their line

const exec = new Executor({ tree: collectModule(file), manifest });
exec.execute({ type: "clip/trim", params: { id: "c1", edge: "out", value: 9.5 } });
exec.undo();
const { text: edited } = foldToSource(text, exec.log(), exec.state());   // the edit as a text change
```

| | |
|---|---|
| `collectModule(mod)`, `resolve(tree, manifest, log?)` | Read a file and place everything in it: sequences, gaps, transitions, anchors, `fill` and `match` durations, transcript references and multicam cuts. Errors are typed and point at the element that caused them. A change costs about 2 µs per element, and placements that did not change keep their identity, so a UI can memoise on them. |
| `Executor` | Runs 98 editor actions (trim, split, move, ripple, keys, effects, captions and more). Each one validates, applies and undoes; history groups a drag into one step. `element/create`, `element/update` and `element/remove` work on every overlay kind, and a remove takes what depends on the element with it. |
| `loadModule`, `buildSourceIndex`, `foldToSource` | `loadModule(source, { imports })` evaluates a file's text; the file may import `react`, `zod` and the kit, plus the modules you pass. `buildSourceIndex` maps ids to their place in the text, and `foldToSource` writes edits back as small token changes. |
| `lint`, `fixSource` | Check the file follows the conventions an editor relies on, and apply the fixes that have one right answer. |
| `@uberscene/sdk/resolver` | The resolver and the manifest types alone, without the parser, the actions or the lint: what a player needs. |
| `affordances`, `timelineRows` | What can be done to one element, and the rows a timeline view shows. |

## Docs

- [Editing](https://uberscene.prefixtree.xyz/guide/editing)
- [Actions](https://uberscene.prefixtree.xyz/reference/actions) and [API](https://uberscene.prefixtree.xyz/reference/api)

MIT licensed.
