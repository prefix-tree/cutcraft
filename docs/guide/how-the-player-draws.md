# How the player draws

This page follows one frame through `@uberscene/player`, from the resolved file to the pixels on screen. The export
draws the same way ([How the export works](./export-architecture)). To use the player, read [Player](./player).

## Three layers in one box

The player stacks three layers in a box the size of the composition:

```text
┌───────────────────────────────────────────┐
│ DOM overlays: titles, shapes, SVG,        │  React, absolutely positioned, one group per track
│ stickers, layers, captions, <Three>,      │
│ <Motion>                                  │
├───────────────────────────────────────────┤
│ canvas: footage, images, nested           │  one 2D canvas, painted from a frame plan
│ sequences, adjustments, transitions       │
├───────────────────────────────────────────┤
│ backdrop: overlays on tracks beneath      │  DOM again, under a transparent canvas
│ every footage track, and the background   │
└───────────────────────────────────────────┘
```

Tracks draw in the order the file writes them, so the first track is at the bottom. Footage goes on the canvas
because it has to be decoded and composited by the pixel. Everything else is DOM, because free code is any React and
CSS and only the browser can lay it out.

## One tick

The `Compositor` draws the canvas. Each tick, for a time `t`, runs four steps:

1. **Plan.** `buildFramePlan(state, t)` lists what shows at `t` (`visiblePlacements`) and turns each clip, nested
   sequence and adjustment into a `DrawOp`: its source time, rect, transform matrix, crop, fit, opacity, blend, CSS
   filter, mask, wipe clip, and its shader effects and transition. The plan is plain data and runs without a DOM.
2. **Sync decoders.** The `DecoderPool` keeps a `ClipDecoder` for every media placement near the play head and drops
   the rest. Assets are opened once and shared, nested sequences included.
3. **Gather frames.** Each op asks its decoder for the picture at its source time. A nested sequence ticks its own
   compositor at its own time and is drawn as a picture.
4. **Paint.** The `CanvasPainter` runs the plan on a 2D context: each op under its own transform, alpha, blend and
   filter. Masks clip, and an adjustment re-filters everything drawn so far through a scratch canvas.

A tick that arrives while another is running is merged into one re-run. A tick on the frame already painted only keeps
the decoders reading ahead.

## Decoding

Footage is decoded with WebCodecs through [mediabunny](https://mediabunny.dev). A `ClipDecoder` has three modes:

| Mode | When | How |
|---|---|---|
| Stream | playing forward | reads from the source into a short queue |
| Reverse | playing backward | decodes windows behind the cursor ahead of time |
| Seek | scrubbing, high speeds | fetches single frames |

While playing, the decoder never blocks a tick. If the frame for `t` isn't ready, it returns the last frame it had, so
the preview stays smooth. A seek or an export asks for an exact frame (`wait: true`), and the tick waits for it.

Decoders sit behind the `FrameSource` interface. The export's [native decoder](./native-codecs) plugs in there.

## Effects and transitions

There are two ways an effect gets drawn:

- **CSS filters** (blur, brightness, saturation…) go on the op's `filter` and are applied by the 2D context.
- **Shader passes** run in WebGL 2. Each pass is a GLSL function (the kit's own or the file's, from `effect()` and
  `transition()`). The runner wraps it in a fragment shader with its params as uniforms. Passes in the middle draw into
  textures, and the last one draws to the canvas.

Where there is no WebGL 2, the painter falls back to `fallbackFilter` and `fallbackOpacity`: a CSS approximation, or a
crossfade for a transition.

Vignette and grain are drawn on the element's own pixels before its other effects. On an adjustment they cover
everything beneath it.

## Overlays

`DomLayer` renders the overlays as React, one positioned group per track, in compositing order. Positions and
keyframes use the same transform maths as the canvas ops, so an overlay lines up with the footage under it.

An overlay with shader effects is drawn by `ShaderBox`. Its DOM lives inside a canvas (HTML-in-Canvas,
`drawElementImage` in Chrome), and the shaders run over that picture. In a browser without HTML-in-Canvas, the
overlay shows without its effects.

`<Three>` and `<Motion>` follow the player's clock instead of their own. A layer that hasn't drawn the current frame
yet holds it (`holdLayerFrame`), and the export waits for those holds before it captures.

## Sound and the clock

The sound is mixed with Web Audio, and the same `AudioContext` keeps the time.

- **Clock.** `AudioClock` reads `AudioContext.currentTime` while audio runs and the performance clock when it doesn't.
  It records an offset at every switch, so time never jumps.
- **Transport.** Composition time is worked out from the clock each time:
  `anchorTime + (now − anchorClock) × rate`. Play, pause, seek and rate changes set a new anchor, so time never
  drifts.
- **Mixing.** `buildAudioPlan` turns the resolved file into chunks with gain envelopes, speed ramps and reversal. The
  `AudioEngine` schedules each chunk a little ahead of the transport. A seek or rate change starts a new session.

The export mixes the same audio plan offline with `mixPlan` instead of playing it.

## Next

- [How the export works](./export-architecture): this player, run headless, one frame at a time.
- [What renders](/reference/rendering): the few values the player accepts but does not draw.
- [Player](./player): embedding it, seeking and capture.
