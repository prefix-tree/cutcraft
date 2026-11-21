---
"@uberscene/kit": minor
"@uberscene/sdk": minor
"@uberscene/player": minor
"@uberscene/render": minor
"uberscene": minor
---

Everything about an element is a prop. A value is a constant, or a list of `{ at, value, easing? }` keys when it changes over time (`at` is seconds into the element; `easing` says how the value leaves that key, linear when left out). Effects are an ordered list on the element, a speed ramp is keys on `speed`, and held frames are a `freezes` list:

```tsx
<Clip id="pour" src="asset:coffee" in={8} out={14}
  transform={{ scale: [{ at: 0, value: 1, easing: "ease-in-out" }, { at: 3.5, value: 1.2 }] }}
  effects={[{ type: "lut", src: "asset:warm" }, { type: "blur", radius: [{ at: 0, value: 8 }, { at: 1, value: 0 }] }]}
  speed={[{ at: 0, value: 1, easing: "easeInOutQuad" }, { at: 1.6, value: 0.4 }]}
  freezes={[{ at: 4.2, duration: 1.4, source: 12.4 }]}
  volume={[{ at: 0, value: 0 }, { at: 0.5, value: 1 }]} pan={-0.3} />
```

- Keys animate `transform.scale` (one list moves both axes, `{ x, y }` each on its own), `rotation`, `opacity`, `anchor.x` and `anchor.y`, `borderRadius`, `crop.x`, `crop.y`, `crop.width` and `crop.height`, `box.x` and `box.y`, `volume`, `pan`, `speed` and every effect param.
- `effects` is on clips, titles, shapes, SVG, stickers, adjustments, nested sequences and layers: each entry `{ type, ...params, enabled? }`, `type` a built-in name or an `effect()` the file declares.
- `freezes` is on clips and audio: each hold `{ at, duration, source }`, from `at` seconds into the element, for `duration`, showing the source frame at `source`.
- `pan` is a new prop; `volume` and `pan` keys replace `automation`.
- Masks, captions, angles, cuts and markers stay children.

Errors on a key or an effect name the element and the prop path (`pour` at `effects.1.radius`). The edit actions address a key by element id, path and time (`key/add`, `key/update`, `key/move`, `key/remove`, `key/setAll`), an effect by its index (`effect/add`, `effect/remove`, `effect/update`, `effect/toggle`, `effect/setOrder`, `effect/setStack`), and the holds with `freeze/setAll`. The player and the export draw the same frames as before.

Breaking: `<Keyframe>`, `<Effect>`, `<SpeedKey>`, `<Freeze>` and the `automation` prop are removed, with the `keyframe/*`, `speed/*` and `audio/setAutomation` actions. A file that still uses them fails with an error naming the fix. To move a file, run:

```sh
uberscene lint --fix video.tsx
```

The new `everything-is-a-prop` rule rewrites the children into props and their imports, and folds `automation` into `volume` keys with the same gain. The playground upgrades a shared link when it opens it.
