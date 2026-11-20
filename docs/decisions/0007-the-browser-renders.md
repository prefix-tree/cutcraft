# 0007. The browser is the renderer

> Corrected in part by [0013](./0013-remotion-has-an-editor-and-layer-handles.md): Remotion has an editor and a browser renderer now.
>
> Superseded in part by [0015](./0015-a-headless-engine-renders-the-export.md): the preview is still the browser's, but export runs a headless engine in Node, not a browser.

## Context

The preview must show exactly what the file says, including arbitrary React
inside `<Layer>`, text with web fonts, CSS filters and blend modes. Two paths
were considered for rendering: ffmpeg filter graphs on a server, and the
browser.

## Decision

The browser renders, for preview now and for export later (a headless browser
driving the same player frame by frame). Footage is decoded with WebCodecs
through mediabunny, one `Input` per asset and one decoder per clip near the
play head. Clips composite on one canvas; text, shapes, SVG, layers and
captions are DOM above it. Web Audio is the clock and the mixer. `seekTo(t)`
and `renderFrame(t)` draw the exact frame for `t`, so the exporter can step
through frames deterministically.

## Consequences

- One renderer, one set of pixels, for preview and export.
- Export runs a browser on the server; that is a cost we accept for fidelity.
- Decoding, compositing and audio scheduling are ours to get right (see the
  player README for what is and is not rendered yet).

## Alternatives

ffmpeg on the server: cannot render React, web fonts or CSS; would be a second
renderer that disagrees with the preview. Remotion: a code renderer without an
editor; its player re-renders React per frame, which is the opposite of our
model, where React draws only overlays and the canvas does the footage.
