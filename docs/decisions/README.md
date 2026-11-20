# Decision records

Why UberScene is built the way it is, one decision per file, in the order they were
made. A record is never edited to say something else; a change of mind adds a
new record that supersedes the old one. [Core principles](../guide/principles.md)
sums them up.

UberScene was called cutcut when the early records were written, and a few still
use that name.

| | Decision |
|---|---|
| [0001](./0001-the-file-is-the-video.md) | The file is the video |
| [0002](./0002-fixed-vocabulary-and-literal-ids.md) | A fixed vocabulary with literal ids |
| [0003](./0003-patch-log-and-four-faced-actions.md) | Editor state is the file plus a patch log; actions have four faces |
| [0004](./0004-the-model-edits-text.md) | The model edits text and has no tool catalog |
| [0005](./0005-sequence-tracks-and-anchors.md) | Sequence tracks by default, anchors for overlays |
| [0007](./0007-the-browser-renders.md) | The browser is the renderer |
| [0008](./0008-tracks-composite-in-document-order.md) | Tracks composite in document order |
| [0009](./0009-helpers-layers-and-editability.md) | Pure helpers, generated elements and the Layer escape hatch |
| [0010](./0010-openreel-as-the-ux-reference.md) | OpenReel is the UX reference, with named deviations |
| [0012](./0012-what-we-adopt-from-diffusion-studio.md) | What we adopt from Diffusion Studio |
| [0013](./0013-remotion-has-an-editor-and-layer-handles.md) | Remotion has an editor now; a Layer's component gets handles |
| [0014](./0014-captions-follow-the-clips.md) | Captions follow the clips |
| [0015](./0015-a-headless-engine-renders-the-export.md) | A headless engine renders the export |
| [0016](./0016-a-theme-lives-in-the-file.md) | A theme lives in the file |
| [0017](./0017-graphics-are-svg-generators.md) | Graphics are SVG generators |
| [0019](./0019-a-browser-engine-for-free-code.md) | A browser engine exports what only a browser draws |
| [0020](./0020-graphic-is-deprecated-for-free-code.md) | `<Graphic>` is deprecated for free code (superseded by 0024) |
| [0021](./0021-one-export-engine.md) | One export engine: the player in Chrome |
| [0024](./0024-graphic-kinds-become-components.md) | Graphic kinds become components; icon stickers are removed |
| [0025](./0025-sound-effects.md) | Sound gets effects: one DSP, run live and in the export (proposed) |
| [0026](./0026-an-agent-looks-at-the-timeline.md) | An agent looks at the timeline: inspect, look, and a frame cache (proposed) |
| [0027](./0027-what-we-adopt-from-hyperframes.md) | What we adopt from HyperFrames (proposed) |
| [0028](./0028-tools-for-narrated-explainers.md) | Tools for narrated explainers: a narration helper, motion and placement in the CLI, pinned labels, diagram parts, `study` (proposed) |
| [0029](./0029-one-hook-for-libraries-that-seek.md) | One hook for libraries that seek: `useSeekable` |
| [0030](./0030-one-chrome-version.md) | One Chrome version: the export runs on Chrome 157 only |
| [0031](./0031-a-smaller-surface-for-the-timeline-vocabulary.md) | A smaller surface for the timeline vocabulary: only what is drawn, `box` and `style`, one naming rule, an SDK package, in two stages |
| [0032](./0032-native-codecs-behind-a-flag.md) | Native codecs behind a flag: craft-video decodes and encodes with `UBERSCENE_CODECS` (experimental) |
| [0033](./0033-time-in-ticks.md) | Time in ticks: frame and sample conversions count 1/254,016,000,000 s, NTSC rates are exact, drop-frame timecode |
