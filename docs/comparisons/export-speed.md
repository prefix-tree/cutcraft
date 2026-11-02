# Export speed

The same three videos rendered by CutCraft, [Remotion](https://www.remotion.dev) and
[Diffusion Studio](https://github.com/diffusionstudio/core) to the same file: H.264 MP4,
1920×1080, 30 fps, 8 Mb/s, no audio. Each tool builds its version through its own
public API and renders at its defaults.

| Scenario | What it is |
|---|---|
| cuts | Five four-second ranges of one 60-second 1080p H.264 file, back to back. Mostly decoding and encoding. |
| crossfades | The same shots with half-second crossfades and a title fading in over each. Compositing and text. |
| graphics | No footage: twelve squares moving across the frame and three titles fading in. |

## Results

Frames per second, each tool at its defaults, on an Apple M3 Pro (12 cores).

<div class="home-chart cc-bench">
<p class="cc-bench-group">cuts</p>
<div class="row"><span class="name">CutCraft</span><span class="track"><span class="bar" style="width: 62%"></span></span><span class="value">199</span></div>
<div class="row"><span class="name">Diffusion Studio</span><span class="track"><span class="bar other" style="width: 62%"></span></span><span class="value">198</span></div>
<div class="row"><span class="name">Remotion</span><span class="track"><span class="bar other" style="width: 7%"></span></span><span class="value">21</span></div>
<p class="cc-bench-group">crossfades</p>
<div class="row"><span class="name">CutCraft</span><span class="track"><span class="bar" style="width: 25%"></span></span><span class="value">80</span></div>
<div class="row"><span class="name">Diffusion Studio</span><span class="track"><span class="bar other" style="width: 59%"></span></span><span class="value">190</span></div>
<div class="row"><span class="name">Remotion</span><span class="track"><span class="bar other" style="width: 7%"></span></span><span class="value">23</span></div>
<p class="cc-bench-group">graphics</p>
<div class="row"><span class="name">CutCraft</span><span class="track"><span class="bar" style="width: 47%"></span></span><span class="value">149</span></div>
<div class="row"><span class="name">Diffusion Studio</span><span class="track"><span class="bar other" style="width: 63%"></span></span><span class="value">201</span></div>
<div class="row"><span class="name">Remotion</span><span class="track"><span class="bar other" style="width: 27%"></span></span><span class="value">85</span></div>
</div>

With every variant measured, median of three runs:

| Scenario | Tool | fps | Render | Setup | PSNR |
|---|---|---|---|---|---|
| cuts | CutCraft | **199** | 3.0 s | 0.1 s | 47.3 dB |
| cuts | CutCraft, software encoder | **242** | 2.5 s | 0.1 s | 52.3 dB |
| cuts | Remotion | **21** | 28.5 s | 1.7 s | 25.9 dB |
| cuts | Remotion, hardware encoder | **27** | 22.2 s | 1.6 s | 25.9 dB |
| cuts | Diffusion Studio | **198** | 3.0 s | 0.4 s | 30.0 dB* |
| cuts | Diffusion Studio, software codecs | **225** | 2.7 s | 0.3 s | 30.0 dB* |
| crossfades | CutCraft | **80** | 6.7 s | 0.2 s | 29.2 dB |
| crossfades | CutCraft, software encoder | **66** | 8.2 s | 0.2 s | 29.2 dB |
| crossfades | Remotion | **23** | 23.3 s | 1.7 s | 24.6 dB |
| crossfades | Remotion, hardware encoder | **30** | 18.2 s | 1.5 s | 24.6 dB |
| crossfades | Diffusion Studio | **190** | 3.2 s | 0.4 s | 30.0 dB* |
| crossfades | Diffusion Studio, software codecs | **200** | 3.0 s | 0.3 s | 30.0 dB* |
| graphics | CutCraft | **149** | 3.6 s | 0.1 s | – |
| graphics | CutCraft, software encoder | **136** | 4.0 s | 0.1 s | – |
| graphics | Remotion | **85** | 6.4 s | 1.7 s | – |
| graphics | Remotion, hardware encoder | **100** | 5.4 s | 1.4 s | – |
| graphics | Diffusion Studio | **201** | 2.7 s | 0.5 s | – |
| graphics | Diffusion Studio, software codecs | **319** | 1.7 s | 0.4 s | – |

PSNR is the middle frame of every shot against the source frame it should show,
decoded on its own. \*Without a licence key Diffusion Studio stamps its watermark on
every frame, which caps its score; it is not a measure of its encoder.

## What it shows

- **Cuts: level with Diffusion Studio.** A frame that is one source picture shown as
  it is goes from CutCraft's decoder to its encoder without being drawn, as WebCodecs
  frames do in Diffusion Studio's canvas pipeline. Remotion takes a screenshot of
  its page for every frame, which is why it is about ten times slower here.
- **Crossfades and graphics: Diffusion Studio is ahead.** Every frame CutCraft has to
  draw is rasterised on the CPU and read back before encoding; Chrome draws Diffusion
  Studio's canvas on the GPU. A browser engine for CutCraft's export, the same plan
  and painter on a GPU canvas, is the planned answer.
- **Hardware encoding** helps CutCraft where the frame is drawn (crossfades and
  graphics); for cuts the software encoder at its balanced preset is faster still on
  this machine.

## On a Linux server

CutCraft on a 4-core Linux machine with no GPU (a GitHub Actions runner), software
encoder, defaults: **111** fps for cuts, **37** for crossfades, **61** for graphics.
Remotion and Diffusion Studio have not been measured on that machine yet.

## How it was measured

- **Verified output.** A render counts only if the file has the codec, size, frame
  rate and frame count its timeline gives, and, for footage, the middle frame of
  every shot is the source frame it should show: of the source frames around it, the
  expected one scores clearly highest.
- **Defaults first.** Each tool runs as it ships; a second row shows its notable
  setting: Remotion's hardware encoder, Diffusion Studio with Chrome's hardware video
  switched off, CutCraft with the software encoder (as on a server without a GPU).
- **Same machine, interleaved.** One warm-up render per tool, then three measured
  rounds in which every tool renders once, so a burst of background load lands on all
  of them; the median counts. Setup (Remotion's bundle, starting a browser, loading a
  page, building the composition) is timed apart from the render.
- **Versions.** CutCraft 0.1.0; Remotion 4.0.540 with `renderMedia` and its default
  concurrency (6 here); Diffusion Studio 4.0.3 in Google Chrome 156, headless.
  Measured 2 November 2026.

The harness lives outside this repository; Remotion and Diffusion Studio were
installed only to be measured. A laptop's numbers move by tens of percent between
runs: compare the tools within the run, not against another machine.
