<p align="center"><img src="../../docs/public/logo.svg" width="64" alt="cutcut logo"></p>

# launch recap

A 25 s product recap written by a model from [`brief.md`](brief.md) under the
instructions in [`prompt.md`](prompt.md), against the assets in
[`manifest.json`](manifest.json). The result is [`video.tsx`](video.tsx):
the file is the video. The guide that explains every choice in it is
`docs/guide/writing-files.md`.

```
pnpm install
pnpm --filter @cutcraft/example-launch-recap gen    # placeholder footage via ffmpeg → public/
pnpm --filter @cutcraft/example-launch-recap dev    # http://localhost:5180
```

The page plays the file with `@cutcraft/player`, shows the lint and resolve
results, and has a tweaks form bound to the file's `schema`.

To use real footage, drop files with the same names into `public/` and update
the manifest (durations, transcript words, shots). `video.tsx` only changes if
the transcript does, because it trims by `word:` and `shot:` references.

`pnpm test` checks that the file passes every lint rule, resolves without
errors, places the story as the brief asked, and that a trim gesture folds
back into a one-token edit of the source.
