# Brand spot in any theme

A twelve-second spot built from graphics around one screen recording: an
opening title over a soft backdrop, the product in a browser window with
callouts, and a closing card with confetti. The look is one prop.

## What the manifest gives it

Only the `screen` recording. Everything else is drawn: `<Graphic>` kinds and
titles in the theme's presets.

## What the file shows

- The composition's theme extends the built-in theme the `theme` prop names:
  every colour, font, radius and entrance comes from it, so the same edit
  renders in `midnight`, `paper` or `neon` with no other change.
- No literal colours or fonts: titles use presets (`kicker`, `h1`, `body`,
  `h2`) and graphics default to tokens.
- The backdrop (`blobs-background`) sits on the lowest track, so it draws
  beneath the screen recording; the callouts, steps and the live pill sit on
  later tracks, above it.
- The window is sized to the scaled recording and anchored to it, so moving
  the clip moves its frame.

## The file

<<< ../../recipes/brand-spot.tsx

## What the editor can do

- Swap the theme from the tweaks panel (it folds into `defaults`), or change one
  value with `theme/setToken` once the theme is a literal.
- Drag the clip: the window, the callouts and the steps follow their anchor.

## What to check

- No lint warnings expected.
- Render it in three themes and look at a few frames of each:

```sh
for t in midnight paper neon; do
  cutcraft recipes/brand-spot.tsx --manifest recipes/manifest.json --media <dir> --props "{\"theme\":\"$t\"}" --out spot-$t.mp4
done
```

Midnight, paper and neon at 2, 5.5, 8 and 11.2 seconds:

![The spot in three themes](/recipes/brand-spot-themes.jpg)
