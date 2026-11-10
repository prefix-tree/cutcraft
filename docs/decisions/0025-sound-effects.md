# 0025. Sound gets effects: one DSP, run live and in the export

> Status: proposed. Follows from [0021](./0021-one-export-engine.md) (one export engine) and builds on the effect
> pipeline of the picture. The work plan at the end is the order it lands in.

## Context

A clip's sound today has volume (with keyframes), fades, pan, automation and ducking under another track, and
nothing else. There is no EQ, no compressor, no limiter, no gate, no de-esser, no reverb, no noise reduction and no
loudness target. Every talking-head cut, podcast clip and launch video needs most of these: a voice is cleaned (cut
the rumble, tame the sibilance, even the level), music is ducked and limited, and the whole mix is brought to the
loudness the platform plays at (about -14 LUFS for YouTube and Spotify, -16 for podcasts, -23 for broadcast). Premiere
Pro's Essential Sound panel is the reference for what an editor expects to find, and it is the biggest gap between
CutCraft and a desktop editor's timeline.

Two things about how sound works now decide the design.

- **The preview and the export compute sound differently.** The player schedules each clip's chunk on a Web Audio
  graph (`source → gain → pan → master`, `packages/player/src/audio/web-audio-output.ts`). The export mixes in the page
  with `mixBlock` (`packages/render/src/mixer.ts`), which computes every output sample from its absolute time and keeps
  no state, so the result does not depend on how the output is cut into blocks. Both read one plan,
  `buildAudioPlan`, so today they agree: gain, pan and speed are functions of time.
- **Effects have state.** A filter's output depends on its last few samples, a compressor's on its envelope over the
  last few hundred milliseconds, a reverb's on the last few seconds. Web Audio's own nodes (`BiquadFilterNode`,
  `DynamicsCompressorNode`, `ConvolverNode`) would run live, but their algorithms are the browser's, unspecified in
  detail, and the stateless export mixer has nothing to match them with. Using them would break "what you preview is
  what you export" for sound.

## Decision

### One DSP implementation, in TypeScript, run in both places

Every sound effect is our own code in `@cutcraft/kit` (`packages/kit/src/sound/`): a pure processor over planar
`Float32Array` blocks, `process(state, input, params) → output`, with its state as plain data. The export runs it
directly in the mixer. The player runs the same module inside an `AudioWorkletProcessor`. Web Audio's effect nodes
are not used. Sample for sample, the preview and the export run the same arithmetic, which a test checks.

Each processor is written from its published technique, named in its file, as the picture's effects are, and no
code is copied from a source whose licence is not compatible with MIT.

| Effect | Technique and reference |
|---|---|
| filters and EQ bands | biquads from R. Bristow-Johnson, "Cookbook formulae for audio EQ biquad filter coefficients" |
| compressor, limiter, gate | feed-forward design with a soft knee and smoothed attack and release, after Giannoulis, Massberg and Reiss, "Digital Dynamic Range Compressor Design: A Tutorial and Analysis" (JAES 2012) |
| de-esser | the compressor on a band-passed sidechain, applied to that band only |
| true-peak limiter | 4x oversampled peak detection as ITU-R BS.1770-4 Annex 2 describes, with look-ahead |
| loudness | K-weighting, 400 ms gated blocks and integration as ITU-R BS.1770-4 and EBU R 128 define them |
| reverb | a Schroeder and Moorer network of comb and all-pass filters (the public-domain Freeverb topology) |
| noise reduction (later) | spectral subtraction (Boll, 1979) with a noise profile taken from the asset's silences |

### Deterministic by chunk

Sound already plays in chunks (`AUDIO_CHUNK_S`, 30 s, cut at freezes). A clip's effect chain processes one chunk with
a fixed **pre-roll**: it starts from zero state a set time before the chunk (one second, or the effect's declared
tail, whichever is longer) and discards that part. The processed chunk is a function of the source and the params
alone, cached like decoded PCM, so the preview after a seek and the export produce the same samples. The pre-roll
covers every effect's memory except long reverbs, whose tail across a chunk boundary is carried by processing the
next chunk's pre-roll over the end of this one.

### Where effects go, and in what order

- **On a clip's sound:** `<Effect>` children of `<Clip>`, `<Audio>` and `<Nested>`, as for the picture. A sound
  effect type is recognised by the registry, so a clip may hold picture and sound effects side by side; each runs on
  its own signal, in the order the file writes them. They run on the sound as it plays, after speed and reverse, and
  before the clip's volume, fades, pan and ducking. So an EQ keeps its frequencies at any speed, and a fade still
  fades the processed sound.
- **On a track (a bus):** `<Effect>` children of `<Track>`, run on the sum of that track's clips. Ducking stays a
  clip prop (`duck`, which names the track to duck under); it now reads the processed sound of the track it ducks under.
- **On the whole mix:** a `loudness` prop on `<Composition>`, such as `{ target: -14, truePeak: -1 }`. The export measures the mix's
  integrated loudness, applies one static gain to reach the target, then the true-peak limiter. The preview applies
  the gain the last measurement found and says when it is out of date.

Sound effects are built-in registry entries with a new draw kind, `sound`, beside `css`, `shader` and `post`. They get
everything the picture's effects get for free: a strict zod schema, defaults, neutral params so a no-op is skipped,
`<Keyframe property="effect.<id>.<param>">` (sampled every `ENVELOPE_STEP_S`, 50 ms, and smoothed), the inspector,
the actions (`effect/add`, `effect/update`), the docs generator and the agent skill's reference.

### Names and units

Params follow the units table, with three new kinds: **level** in decibels (`threshold`, `gain`, `makeup`, `ceiling`,
`target`, `range`), **frequency** in hertz (`frequency`, `lowCut`, `highCut`) and **ratio** (`ratio`, as 4 for 4:1).
Times stay in seconds (`attack: 0.01`). The first set:

| Type | What it does | Main params |
|---|---|---|
| `highPass`, `lowPass` | cut below or above a frequency | `frequency`, `slope` (12, 24, 48 dB per octave) |
| `eq` | up to eight bands: low and high shelves, peaks, notches | `bands: [{ type, frequency, gain, q }]` |
| `compressor` | evens the level | `threshold`, `ratio`, `attack`, `release`, `knee`, `makeup` |
| `limiter` | holds peaks under a ceiling | `ceiling`, `release`, `truePeak` |
| `gate` | silences what falls below a level | `threshold`, `range`, `attack`, `hold`, `release` |
| `deEsser` | tames sibilance | `frequency`, `threshold`, `range` |
| `reverb` | places the sound in a room | `size`, `damping`, `width`, `mix` |
| `delay` | echoes | `time`, `feedback`, `mix` |

### The manifest learns each asset's loudness

`cutcraft add` measures each sound asset with the same BS.1770 code and stores, under `audio.loudness`, its
integrated loudness, true peak and the 100 ms block energies BS.1770 gates over (ten numbers a second per channel).
From those, the integrated loudness of any range of the asset is exact at block granularity without decoding it
again. That gives two things:

- a clip prop, `normalize={-16}`, that sets a clip's static gain so its own range reads at that loudness ("match
  loudness" in an editor), known while editing and in the preview, with no analysis pass;
- a quick estimate of the whole mix's loudness for the preview and the layout check, before the export measures it
  exactly.

### Presets are components, not new effects

"Clean up a voice", "music bed" and "podcast master" are pure functions that return effect chains, like the picture's
components (0024): `VoiceClean`, `MusicBed`, `PodcastMaster`. A file that uses one gets plain `<Effect>` elements it
can edit, and the editor bakes them on the first change.

## Consequences

- Sound reaches what an editor expects of a desktop tool, free under MIT, as elements in the file that an agent can
  write and a person can tune.
- Preview and export stay one engine for sound, at the cost of writing our own DSP instead of using the browser's
  nodes. Each effect needs its reference written down and a test against known values: a filter's magnitude response
  at chosen frequencies, a compressor's static curve, BS.1770 against the EBU Tech 3341 test signals (a stereo 1 kHz
  sine at -23 dBFS reads -23 LUFS), and a sample-exact comparison of the worklet against the direct call.
- The export mixer changes shape: from one stateless sum to clip chains, then per-track buses, then the master. The
  block-independence property is kept at chunk granularity rather than per sample, and a test keeps it.
- Processing costs time in the export and CPU in the preview. Biquads and dynamics are cheap; reverb and noise
  reduction are not. The docs say which are heavy, and the sound benchmark joins the shader benchmark in CI.
- The preview's first play after a seek waits for the processed chunk, as it waits for decoding now; the pre-roll adds
  up to a second of processing, done in the worklet's thread.
- Effect names join the vocabulary (0002): adding one is cheap, renaming one is a breaking change.

## Alternatives

**Web Audio's nodes in the preview and an `OfflineAudioContext` in the export.** Fastest to build, and the nodes are
good. But the export would then run the browser's DSP in a second graph, offline and continuous, while the preview
runs it live and in pieces after every seek; the two cannot be made sample-identical, and the stateless mixer that
makes the export deterministic would go. It also ties the sound to one browser's undocumented algorithms.

**WebAssembly DSP.** Faster for reverb and noise reduction, and an option later for those two. For filters and
dynamics, TypeScript is fast enough, and one language keeps the kit simple; a processor's interface does not change if
its body later moves to WebAssembly.

**Effects only on the master.** Simpler, but a voice and a music bed need different treatment, which is the point of
clip and track effects.

**Loudness by analysis in the preview.** Measuring the whole mix whenever it changes means decoding every source.
Storing block energies in the manifest makes clip normalisation exact and instant, and leaves the one full
measurement to the export, where the sound is mixed anyway.

## Work plan

Each step is one pull request with its tests, docs and changeset.

1. **The sound pipeline.** `packages/kit/src/sound/` with the processor interface, the `sound` draw kind, chunked
   processing with pre-roll in the export mixer, the `AudioWorkletProcessor` in the player, keyframed params, and
   `highPass`, `lowPass` and `eq`. Tests: filter responses, the worklet against the direct call, block independence,
   and a preview and export parity test in the browser suite.
2. **Dynamics.** `compressor`, `limiter` (with true peak), `gate` and `deEsser`. Tests: static curves, attack and
   release times, true-peak detection on intersample peaks.
3. **Buses.** `<Effect>` on `<Track>`, and the mixer's per-track sums, with ducking reading the processed track.
4. **Loudness.** BS.1770 in the kit, `audio.loudness` written by `cutcraft add`, `normalize` on clips,
   `<Composition loudness>` with the two-pass export, and the layout check's loudness line. Tests against EBU Tech 3341.
5. **Space and presets.** `reverb` and `delay`, then the `VoiceClean`, `MusicBed` and `PodcastMaster` components, with
   demo pages that let the docs play each before and after.
6. **Later:** noise reduction from the asset's silences, and a WebAssembly body for reverb and noise reduction if the
   benchmark asks for it.
