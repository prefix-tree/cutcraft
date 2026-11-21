# 0034. Everything about an element is a prop

> Status: accepted. Supersedes in part [0002](./0002-fixed-vocabulary-and-literal-ids.md) (a collection the
> inspector edits one by one is child elements), and §8 and plan step H of
> [0031](./0031-a-smaller-surface-for-the-timeline-vocabulary.md).

## Context

An element was written in two places. Most of what it is sat in its props: `transform`, `box`, `volume`, `speed`.
The rest sat in children, each with an id someone had to invent:

```tsx
<Clip id="pour" src="asset:coffee" in={10} out={14}>
  <SpeedKey id="pour-s0" at={0} speed={1} />
  <SpeedKey id="pour-s1" at={1.6} speed={0.4} easing="easeInOutQuad" />
  <Freeze id="pour-hold" at={12.4} start={4.2} duration={1.4} />
  <Effect id="pour-warm" type="lut" params={{ src: "asset:warm" }}>
    <Keyframe id="pour-warm-0" param="amount" at={0} value={0} />
    <Keyframe id="pour-warm-1" param="amount" at={1} value={1} />
  </Effect>
</Clip>
```

A scale was a prop until it moved; then it became `<Keyframe property="transform.scale.x">` children, one list per
axis. A volume was a prop until it changed; then it was `automation={{ volume: [[0, 0], [0.5, 1]] }}`, a third way,
and one that multiplied with `volume` rather than replacing it.

[0002](./0002-fixed-vocabulary-and-literal-ids.md) made children the rule, so that the editor could find and change
one keyframe or one effect by its id. [0031](./0031-a-smaller-surface-for-the-timeline-vocabulary.md) §8 saw the cost
in length and proposed a key list as a value, turned back into `<Keyframe>` children on the first edit. That is two
spellings of the same thing: a person or a model reading a file has to know both, and a file changes shape when
someone drags a key.

## Decision

**One spelling: props.** A number, or any value, is a constant. A list of `{ at, value, easing? }` keys is a value
that changes over time. `at` is seconds into the element; `easing` says how the value leaves that key, linear when
left out.

```tsx
<Clip id="pour" src="asset:coffee" in={10} out={14}
  speed={[{ at: 0, value: 1, easing: "easeInOutQuad" }, { at: 1.6, value: 0.4 }]}
  freezes={[{ at: 4.2, duration: 1.4, source: 12.4 }]}
  effects={[{ type: "lut", src: "asset:warm", amount: [{ at: 0, value: 0 }, { at: 1, value: 1 }] }]} />
```

- Keys animate `transform.scale` (a list moves both axes, `{ x, y }` each), `rotation`, `opacity`, `anchor.x` and
  `anchor.y`, `borderRadius`, the four sides of `crop`, `box.x` and `box.y`, `volume`, `pan`, `speed`, and every
  param of every effect.
- `effects` is an ordered list on the element, each `{ type, ...params, enabled? }`. `type` is a built-in name or an
  `effect()` the file declares. Clips, titles, shapes, SVG, stickers, adjustments, nested sequences and layers take it.
- `freezes` is a list on clips and audio, each `{ at, duration, source }`: where the hold starts in the element, how
  long it lasts, and which source frame it holds.
- `volume` and `pan` keys replace `automation`.
- Masks, captions, angles, cuts and markers stay children. They are things with their own time and shape, not values
  of the element.

**The resolver expands the props into its own items.** After the patch log is overlaid, `expandKeys` turns each key,
effect, speed key and hold into the same item the children used to make, with an id derived from where it came from:
the second key of the blur's radius on `pour` is `pour.effects.1.radius.1`. The player and the export read those
items as before and do not change.

**Errors point at the prop.** A bad blur radius is reported on `pour`, at `effects.1.radius`: the element and the
path in it, not an id nobody wrote.

**Edits address by place.** A key is found by element id, path and time: `key/add`, `key/update`, `key/move`,
`key/remove` and `key/setAll` take `{ id, path, at }`. An effect is found by its index: `effect/add`, `remove`,
`update`, `toggle`, `setOrder` and `setStack`. `freeze/setAll` replaces the holds. Adding a key to a constant turns it
into a list, and removing the last but one turns it back.

**Old files move with one command.** A file that still writes `<Keyframe>`, `<Effect>`, `<SpeedKey>`, `<Freeze>` or
`automation` fails with an error naming `uberscene lint --fix`. The lint rule `everything-is-a-prop` rewrites it,
imports included. The playground upgrades a shared link when it opens it.

## Evidence

- **Edits by a model.** An eval ran the same edits on Haiku in both spellings: 10 tasks on a 3-clip file, 6 on a
  6-clip file that touch several clips each, and 2 on a 20-clip file that touch every clip, 36 answers per spelling.
  All 36 were right in each. The prop answers were 21% to 39% shorter: 939 against 745, 1549 against 1154, and 6723
  against 4096 output tokens. The eval lived in `scripts/evals/spelling` and was removed once it had answered.
- **Pictures.** The 52 files the fix migrated in this repository were rendered before and after: all 312 frames are
  identical.

## Alternatives set aside

- **Keep the children.** Every edit the children allowed, the paths allow too, without ids to invent and keep unique.
  The files are longer, and an element is read in two places.
- **0031's two spellings.** A list as a value that turns into children on the first edit. The reader has to know both,
  and the file changes shape under a drag.
- **A `keys()` helper with tuples.** `keys([0, 1], [3.5, 1.2, "easeInOutSine"])` is short, but its slots are by
  position: which number is the time and which the value is not on the page.

## Consequences

- Every file with the old children stops resolving until `uberscene lint --fix` moves it. Every file in this
  repository has moved.
- A key list written as an expression (a variable, a `.map`) cannot be edited key by key: the editor locks the whole
  prop, as it does any computed prop.
- `automation` multiplied with `volume`. The fix folds the two into one list of `volume` keys with the same gain at
  every point, so a moved file sounds the same.
