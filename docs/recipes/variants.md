# Variants from one file

One cut rendered for many brands or markets: copy, colour and logo are schema props, and a variant is `defaults` with overrides.

## What the manifest gives it

The `product` footage and the `logo` image are shared; everything that changes is a prop.

## What the file shows

- Titles bind their text and colour to the schema; `src={logo}` binds the card's asset.
- `collectModule(file, overrides)` renders a variant without touching the file; the tweaks panel edits the same props.
- No `<Caption>` cues and no `src`: the captions element is a styled placeholder for the voice-over each market records.

## The file

<<< ../../recipes/variants.tsx

## What the editor can do

- Every tweak folds into `defaults`, so the file stays one source for all variants.
- Everything else (timing, shots) is shared and edited once.

## What to check

- No lint warnings expected.
- `captureSheet([0.8, 7, 12.5])` per variant: the headline in the brand colour, the detail shot, the card.
