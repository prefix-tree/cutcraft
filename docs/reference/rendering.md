# What renders

What the player and the export draw, out of what the schemas accept. Generated from `packages/kit/src/jsx/rendering.ts` by `pnpm docs:gen`; do not edit by hand.

The check's `not-rendered` warning reports everything outside these lists, so a file that checks clean renders as written.

## Values that render

- `blend` on `<Title>`, `<Shape>`, `<Svg>`, `<Sticker>`, `<Graphic>`, `<Layer>`: only `normal` renders; any other value is drawn unblended over the footage, in the preview and the export.
- A `<Mask>` on an element other than `<Clip>`, `<Nested>` is ignored: masks render on clips and nested sequences only, the element shows unmasked; a second `<Mask>` is ignored: only the first `<Mask>` on an element renders.

## Accepted but not rendered

No value means any value except one that asks for nothing (`false`, `0`, `"none"`, `"all"`).

| element | prop | value | what happens |
|---|---|---|---|
| `<Composition>` | `background.mode` | `blur` | draws as the plain colour when an overlay sits beneath the footage |
| `<Captions>` | `animation` | `typewriter` | types out only cues without word timings; cues with words show as karaoke |
| `<SpeedKey>` inside `<Nested>` | the element |  | is ignored inside `<Nested>`: the sequence plays at its constant speed |
| `<Freeze>` inside `<Nested>` | the element |  | is ignored inside `<Nested>`: the sequence plays at its constant speed |
| `<Effect>` inside `<Title>`, `<Shape>`, `<Svg>`, `<Sticker>`, `<Graphic>`, `<Layer>` | `type` | `vignette` | is not drawn on an overlay yet: put it on the clip, or on an `<Adjustment>` to cover everything beneath |
| `<Effect>` inside `<Title>`, `<Shape>`, `<Svg>`, `<Sticker>`, `<Graphic>`, `<Layer>` | `type` | `grain` | is not drawn on an overlay yet: put it on the clip, or on an `<Adjustment>` to cover everything beneath |
