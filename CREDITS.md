# Credits

Code in UberScene that comes from other projects. Each file that holds some names its source in its header.

| From | Licence | What | Where |
|---|---|---|---|
| [craft-libs](https://github.com/storytold/craft-libs) (craft-video, craft-media), the ArtCraft team | [MIT OR Apache-2.0](https://github.com/storytold/craft-libs/blob/main/LICENSE-MIT) | The native codecs' decoders, encoders and container readers, used as a library at a pinned commit. How each decoder is driven (configuration records, seeking from a sync sample, planes to 4:2:0) follows FilmCraft's `crates/codecs`. | `native/` |
| [HyperFrames](https://github.com/heygen-com/hyperframes), Copyright 2026 HeyGen, Inc. | [Apache-2.0](http://www.apache.org/licenses/LICENSE-2.0) | The loudness measure: K-weighting, gating and the true-peak kernels, changed to measure a stream. | `packages/render/src/loudness.ts` |
