# Spelling eval: keys and effects as children or as props

Does a model edit a file more reliably when keyframes and effects are child elements (`<Keyframe>`, `<Effect>`, today's
spelling) or values on the element (`transform={{ opacity: [{ at, value }] }}`, `effects={[{ type }]}`, the proposed
one)? This runs the same edits in both and scores each answer with the real resolver and lint.

```sh
npx tsx scripts/evals/spelling/run.ts --model claude-haiku-5-5 --trials 3 [--base small|large|huge] [--out rows.json]
```

It needs the `claude` command line (`claude -p`). Each answer is one call with no tools, from an empty directory.

| File | What |
|---|---|
| `base.<size>.<spelling>.tsx` | The file to edit, the same video in each spelling: 3, 6 and 20 clips. |
| `tasks.ts` | The edits, in words, each with a check of the resolved result, including what must not change. |
| `prompt.ts` | What the model is told: one shared reference, then the section that differs by spelling. |
| `to-children.ts` | Rewrites the proposed spelling into today's, so the real resolver and lint can check it. Literal values only. |
| `check.ts` | Loads an answer and reads back its keys and effects. |

An answer is **clean** when it loads, resolves and lints with no error, and **right** when it is clean and the edit is
the one asked for.

## Result, 2026-11-20, claude-haiku-5-5

| Tasks | Answers per spelling | Right, children | Right, props | Output tokens, children | Output tokens, props |
|---|---|---|---|---|---|
| 10 on 3 clips | 10 | 10 | 10 | 939 | 745 |
| 6 on 6 clips, several clips per edit | 18 | 18 | 18 | 1549 | 1154 |
| 2 on 20 clips, every clip edited | 8 | 8 | 8 | 6723 | 4096 |

Every answer was right in both spellings, so these tasks do not separate them on correctness. The proposed spelling's
answers are 21% to 39% shorter, more so the more is animated.

What it does not test: writing a video from nothing, a file read without this reference, larger models, or edits
through the editor's actions.
