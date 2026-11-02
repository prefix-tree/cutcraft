# Browser export spike (Phase 0)

Throwaway code that answered whether a browser export can render free code fast, before building it
(plan: free code plus a browser export engine). Phase 2 turns it into `src/web/`.

- `capture.mjs`, `webgl.mjs`, `canvas2d*.mjs`: what Chrome's HTML-in-Canvas (`drawElementImage`) captures, against
  screenshots of the same HTML.
- `page/`, `vite.config.ts`, `run.ts`: the real Player in headless Chrome, stepped frame by frame, captured with
  `drawElementImage` and encoded with WebCodecs (mediabunny `CanvasSource`).
  `npx tsx spike/run.ts cuts|crossfades|graphics|free` (`SPIKE_ARGS="--disable-gpu-vsync --disable-frame-rate-limit"`).
- `free.tsx`: free code in a Layer (hooks, CSS 3D, a CSS animation, a WebGL shader, filters, blend) over footage.

Findings on an M3 Pro, Chrome 156 with `--enable-features=CanvasDrawElement` (on by default from 157):

- 191 / 185 / 202 fps on cuts / crossfades / graphics, 1080p H.264; all pass the frame checks. Without
  `--disable-gpu-vsync --disable-frame-rate-limit` the paint event caps it at 60.
- Captured against screenshots: CSS 3D 55 dB, filters 72, backdrop-filter 49, blend 60, masks 68, SVG filters and
  CSS keyframes identical; WebGL and 2D canvases captured. A canvas made with `willReadFrequently: true` is not.
- With CSS and Web Animations paused at the frame's time, two runs capture identical pixels (0 of 120 frames differ);
  the hardware encoder still varies the encoded bytes.
- Not measured: Linux without a GPU.
