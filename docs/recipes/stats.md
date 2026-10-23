# Stats with handles

Two numbers count up over product footage. Each counter is one component inside a Layer, so its value and label are handles.

## What the manifest gives it

The `product` asset has four shots; `bg` and `bg2` are shots 1 and 2 at half opacity.

## What the file shows

- `useLayer()` gives the counter its progress; scrubbing shows the right number.
- `<Layer>` with one component child exposes that component's literal props as handles (`layer/setProps`) and keeps the body opaque.
- `accent` is bound to the schema: an inspector change writes `defaults`.

## The file

<<< ../../recipes/stats.tsx

## What the editor can do

- Change `value` or `label` in the inspector: one attribute of the `<Counter>` tag changes.
- Drag the layer: its `offset` changes; the counter re-times itself.

## What to check

- No lint warnings expected.
- `captureSheet([1, 3.5, 7, 9])`: counting, settled, the second counter counting, settled. The counters are DOM, so they appear in the player and not on the canvas sheet; check them in the preview.
