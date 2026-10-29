# What renders

What the player and the export draw, out of what the schemas accept. Generated from `packages/kit/src/jsx/rendering.ts` by `pnpm docs:gen`; do not edit by hand.

The check's `not-rendered` warning reports everything outside these lists, so a file that checks clean renders as written.

## Values that render

- `type` on `<Transition>`: only `crossfade`, `dipToBlack`, `dipToWhite`, `wipe`, `slide`, `push` render; any other value draws as a crossfade.
- `type` on `<Effect>`: only `brightness`, `contrast`, `saturation`, `hue`, `blur`, `grayscale`, `sepia`, `invert`, `shadow`, `temperature`, `tint`, `levels`, `vignette`, `grain` render; any other value is ignored: the picture renders without it.
- `type` on `<AudioEffect>`: no value renders; any value is ignored: the audio plays without it.
- `animation.preset` on `<Title>`: only `none`, `fade`, `slide-up`, `slide-down`, `slide-left`, `slide-right`, `scale`, `typewriter`, `word-by-word` render; any other value shows as a fade.
- `animation` on `<Captions>`: only `none`, `word-highlight`, `word-by-word`, `karaoke` render; any other value shows as karaoke.
- `type` on `<Mask>`: only `shape`, `drawn` render; any other value is ignored: matte masks are not rendered, the element shows unmasked.
- `blend` on `<Title>`, `<Shape>`, `<Svg>`, `<Sticker>`, `<Graphic>`, `<Layer>`: only `normal` renders; any other value blends with the footage in the export only: the preview draws it unblended over the footage.
- A `<Mask>` on an element other than `<Clip>`, `<Nested>` is ignored: masks render on clips and nested sequences only, the element shows unmasked; a second `<Mask>` is ignored: only the first `<Mask>` on an element renders.

## Accepted but not rendered

No value means any value except one that asks for nothing (`false`, `0`, `"none"`, `"all"`).

| element | prop | value | what happens |
|---|---|---|---|
| any element | `emphasis` |  | is ignored: emphasis animations are not rendered |
| any element | `transform.rotate3d` |  | is ignored: 3D transforms are not rendered |
| any element | `transform.perspective` |  | is ignored: 3D transforms are not rendered |
| any element | `transform.transformStyle` |  | is ignored: 3D transforms are not rendered |
| `<Keyframe>` | `property` | `transform.position.z` | is ignored: 3D transforms are not rendered |
| `<Keyframe>` | `property` | `transform.rotation.x` | is ignored: 3D transforms are not rendered |
| `<Keyframe>` | `property` | `transform.rotation.y` | is ignored: 3D transforms are not rendered |
| `<Keyframe>` | `property` | `transform.perspective` | is ignored: 3D transforms are not rendered |
| `<Clip>` | `chromaKey` |  | is ignored: the green screen stays in the picture |
| `<Clip>` | `stabilize` |  | is ignored: the footage renders unstabilised |
| `<Clip>` | `behindSubject` |  | is ignored: the clip draws in its track order |
| `<Title>` | `behindSubject` |  | is ignored: the title draws over the footage |
| `<Title>` | `text3d` |  | is ignored: the title renders as flat text |
| `<Clip>` | `smoothSlowMo` |  | is ignored: slow motion repeats frames |
| `<Clip>` | `interpolation` |  | is ignored: slow motion repeats frames |
| `<Clip>`, `<Audio>` | `pitchCorrection` |  | is ignored: sped-up or slowed audio changes pitch |
| `<Clip>`, `<Audio>` | `audioTrack` |  | is ignored: the asset's first audio stream plays |
| `<SpeedKey>`, `<Freeze>` | the element |  | is ignored inside `<Nested>`: the sequence plays at its constant speed |
| `<Effect>` | `params.gamma` |  | is ignored: levels render their black and white points only |
| `<Transition>` | `params.direction` | `diagonal` | draws as a wipe to the left |
| `<Transition>` | `params.softness` |  | is ignored: the wipe has a hard edge |
| `<Adjustment>` | `affects` |  | is ignored: the adjustment filters every track below it |
| `<Composition>` | `background.mode` | `blur` | draws as the plain colour when an overlay sits beneath the footage |
| `<Mask>` | `matte` |  | is ignored: matte masks are not rendered, the element shows unmasked |
| `<Captions>` | `animation` | `bounce` | has no motion: it shows as karaoke |
| `<Captions>` | `animation` | `typewriter` | types out only cues without word timings; cues with words show as karaoke |
| `<ColorGrade>` | `wheels` |  | is ignored: only temperature and tint render |
| `<ColorGrade>` | `curves` |  | is ignored: only temperature and tint render |
| `<ColorGrade>` | `lut` |  | is ignored: only temperature and tint render |
| `<ColorGrade>` | `hsl` |  | is ignored: only temperature and tint render |
