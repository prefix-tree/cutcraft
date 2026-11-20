---
editLink: false
---

# Elements

The elements a file is written in: the timeline (clips, tracks, transitions, captions), free code, titles, shapes and effects. Each page shows an example as the export renders it, with the file that made it, then the element's props. Every element is built from the same parts (an id, its timing, where it sits, how it looks, its children): [Anatomy of an element](/guide/elements) explains them once. Generated from the Zod schemas in `packages/kit/src/jsx/schemas`; run `pnpm docs:gen`, and `pnpm docs:examples` for the videos.

## Timeline

<div class="cc-cards">
<PreviewCard code title="<Composition>" link="/reference/elements/composition" src="previews/elements/composition" text="The video: frame rate, size, background and theme. It ends where its content ends." />
<PreviewCard code title="<Track>" link="/reference/elements/track" src="previews/elements/track" text="A row of elements. A sequence track plays its children back to back; a free track (layout=&quot;free&quot;) places each at its own start." />
<PreviewCard code title="<Clip>" link="/reference/elements/clip" src="previews/elements/clip" text="A stretch of a video or image asset, trimmed by seconds, transcript words or camera shots, with speed, fit and transform." />
<PreviewCard code title="<Gap>" link="/reference/elements/gap" src="previews/elements/gap" text="Empty time between clips on a sequence track." />
<PreviewCard code title="<Transition>" link="/reference/elements/transition" src="previews/elements/transition" text="A blend between the two clips it sits between on a sequence track." />
<PreviewCard code title="<Marker>" link="/reference/elements/marker" text="A named point on the timeline." />
</div>

## Free code

<div class="cc-cards">
<PreviewCard code title="<Layer>" link="/reference/elements/layer" src="previews/elements/layer" text="Free code in the frame: any React, CSS, canvas or WebGL, placed on the timeline like any overlay; useT() is its time." />
<PreviewCard code title="<Three>" link="/reference/elements/three" src="previews/elements/three" text="A three.js scene on the timeline: plain three.js in setup, or React Three Fiber children, on the video's clock." />
<PreviewCard code title="<Motion>" link="/reference/elements/motion" src="previews/elements/motion" text="Children animated by a Motion sequence on the video's clock." />
</div>

## Text and graphics

<div class="cc-cards">
<PreviewCard code title="<Title>" link="/reference/elements/title" src="previews/elements/title" text="Text over the picture in the theme's type, with entrances by letter or by word." />
<PreviewCard code title="<Captions>" link="/reference/elements/captions" src="previews/elements/captions" text="Subtitles from an asset's transcript that follow the clips through every trim." />
<PreviewCard code title="<Caption>" link="/reference/elements/caption" src="previews/elements/captions" text="One cue inside <Captions>, written by hand: its text, start and end." />
<PreviewCard code title="<Shape>" link="/reference/elements/shape" src="previews/elements/shape" text="A vector shape (rectangle, circle, star, polygon, path) with fill, stroke and shadow." />
<PreviewCard code title="<Svg>" link="/reference/elements/svg" src="previews/elements/svg" text="One-off vector art from inline SVG markup or a file." />
<PreviewCard code title="<Sticker>" link="/reference/elements/sticker" src="previews/elements/sticker" text="A ready-made icon or sticker by name." />
</div>

## Effects and colour

<div class="cc-cards">
<PreviewCard code title="<Adjustment>" link="/reference/elements/adjustment" src="previews/elements/adjustment" text="Filters everything beneath it, through its effects, for its own stretch of time." />
<PreviewCard code title="<Mask>" link="/reference/elements/mask" src="previews/elements/mask" text="Shows only a shape of its clip, with a feathered edge or inverted." />
</div>

## Structure

<div class="cc-cards">
<PreviewCard code title="<Nested>" link="/reference/elements/nested" src="previews/elements/nested" text="A sequence written once as a component and placed like a clip." />
<PreviewCard code title="<Multicam>" link="/reference/elements/multicam" src="previews/elements/multicam" text="Several camera angles of one take; <Cut>s pick which one shows." />
<PreviewCard code title="<Angle>" link="/reference/elements/angle" src="previews/elements/multicam" text="One camera of a <Multicam>: its asset and sync offset." />
<PreviewCard code title="<Cut>" link="/reference/elements/cut" src="previews/elements/multicam" text="Switches a <Multicam> to an angle at a moment." />
</div>

## Sound

<div class="cc-cards">
<PreviewCard code title="<Audio>" link="/reference/elements/audio" text="A stretch of a sound asset: volume and pan (constant or keys), fades, ducking under another track." />
</div>

## Capabilities

| element | timed | visual | audio | trims source | transformable | children allowed |
|---|---|---|---|---|---|---|
| [`<Composition>`](/reference/elements/composition) |  |  |  |  |  | `track`, `marker`, `captions` |
| [`<Track>`](/reference/elements/track) |  |  |  |  |  | `clip`, `audio`, `gap`, `transition`, `title`, `shape`, `svg`, `sticker`, `adjustment`, `nested`, `layer`, `multicam` |
| [`<Clip>`](/reference/elements/clip) | yes | yes | yes | yes | yes | `effect`, `keyframe`, `mask`, `speedKey`, `freeze` |
| [`<Audio>`](/reference/elements/audio) | yes |  | yes | yes |  | `keyframe`, `speedKey`, `freeze` |
| [`<Gap>`](/reference/elements/gap) | yes |  |  |  |  |  |
| [`<Transition>`](/reference/elements/transition) | yes | yes |  |  |  |  |
| [`<Title>`](/reference/elements/title) | yes | yes |  |  | yes | `effect`, `keyframe`, `mask` |
| [`<Shape>`](/reference/elements/shape) | yes | yes |  |  | yes | `effect`, `keyframe`, `mask` |
| [`<Svg>`](/reference/elements/svg) | yes | yes |  |  | yes | `effect`, `keyframe`, `mask` |
| [`<Sticker>`](/reference/elements/sticker) | yes | yes |  |  | yes | `effect`, `keyframe`, `mask` |
| [`<Captions>`](/reference/elements/captions) |  | yes |  |  |  | `caption` |
| [`<Caption>`](/reference/elements/caption) | yes | yes |  |  |  |  |
| [`<Marker>`](/reference/elements/marker) |  |  |  |  |  |  |
| [`<Adjustment>`](/reference/elements/adjustment) | yes | yes |  |  |  | `effect`, `keyframe` |
| [`<Mask>`](/reference/elements/mask) |  |  |  |  |  |  |
| [`<Nested>`](/reference/elements/nested) | yes | yes | yes | yes | yes | `effect`, `keyframe`, `mask`, `speedKey`, `freeze` |
| [`<Multicam>`](/reference/elements/multicam) |  |  |  |  |  | `angle`, `cut` |
| [`<Angle>`](/reference/elements/angle) |  |  |  |  |  |  |
| [`<Cut>`](/reference/elements/cut) |  |  |  |  |  |  |
| [`<Layer>`](/reference/elements/layer) | yes | yes |  |  | yes | `effect`, `keyframe` |
