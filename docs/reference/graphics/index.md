# Graphics

::: warning Deprecated
`<Graphic>` and its kinds are deprecated and will be removed in a later release; the lint warns on each one. Draw the same thing with `<Motion>`, `<Three>` or a `<Layer>`: the [examples](/examples) show each, and [Free code](/guide/free-code) explains them.
:::

Built-in kinds of `<Graphic>`: pure functions from props and the theme to SVG, drawn the same in the preview and the export. Each card plays its example as the export renders it; its page has the code. Generated from `packages/graphics`; run `pnpm docs:gen` and `pnpm docs:previews`.

<Example src="previews/graphics/lower-third" alt="A lower third">

```tsx
<Composition fps={30} width={640} height={360}>
  <Track id="main" layout="free">
    <Graphic id="g1" kind="lower-third" start={0} duration={3} />
  </Track>
</Composition>
```

</Example>

Every kind also takes the [`<Graphic>` props](/reference/elements/graphic): timing, `transform`, `enter`/`exit`, `style`, and `width`/`height` for its box. Colours and fonts default to theme tokens.

## Arrows

<div class="cc-cards">
<PreviewCard code title="arrow" link="/reference/graphics/arrow" src="previews/graphics/arrow" text="A straight arrow across its box, pointing right." />
<PreviewCard code title="curved-arrow" link="/reference/graphics/curved-arrow" src="previews/graphics/curved-arrow" text="An arrow that arcs from the bottom left to the bottom right of its box." />
<PreviewCard code title="hand-arrow" link="/reference/graphics/hand-arrow" src="previews/graphics/hand-arrow" text="A loose, marker-drawn arrow with a slight curve." />
</div>

## Callouts

<div class="cc-cards">
<PreviewCard code title="callout" link="/reference/graphics/callout" src="previews/graphics/callout" text="Text in a rounded box with a pointer on one side." />
<PreviewCard code title="speech-bubble" link="/reference/graphics/speech-bubble" src="previews/graphics/speech-bubble" text="A round comic-style bubble with a tail to one side below it." />
<PreviewCard code title="badge" link="/reference/graphics/badge" src="previews/graphics/badge" text="A round badge with a short word or two, and a ring inside its edge." />
<PreviewCard code title="pill" link="/reference/graphics/pill" src="previews/graphics/pill" text="A fully rounded label, with an optional dot before the text (a live indicator, a status)." />
<PreviewCard code title="burst" link="/reference/graphics/burst" src="previews/graphics/burst" text="A starburst sticker with a word on it, for prices, offers and shouts." />
</div>

## Lower thirds

<div class="cc-cards">
<PreviewCard code title="lower-third" link="/reference/graphics/lower-third" src="previews/graphics/lower-third" text="A name and a role on a panel with an accent bar at its left edge." />
<PreviewCard code title="lower-third-card" link="/reference/graphics/lower-third-card" src="previews/graphics/lower-third-card" text="A name and a role on a rounded card, with an accent dot before the name." />
<PreviewCard code title="lower-third-split" link="/reference/graphics/lower-third-split" src="previews/graphics/lower-third-split" text="The name on an accent block and the role on a panel below it, offset to the right." />
</div>

## Frames

<div class="cc-cards">
<PreviewCard code title="corner-brackets" link="/reference/graphics/corner-brackets" src="previews/graphics/corner-brackets" text="Four corner marks framing a region, like a viewfinder." />
<PreviewCard code title="frame" link="/reference/graphics/frame" src="previews/graphics/frame" text="A rounded border around a region, solid or dashed." />
<PreviewCard code title="device-frame" link="/reference/graphics/device-frame" src="previews/graphics/device-frame" text="A phone or a browser window drawn around an open screen." />
</div>

## Highlights

<div class="cc-cards">
<PreviewCard code title="underline" link="/reference/graphics/underline" src="previews/graphics/underline" text="A hand-drawn underline to put under a word." />
<PreviewCard code title="circle-scribble" link="/reference/graphics/circle-scribble" src="previews/graphics/circle-scribble" text="A loose hand-drawn loop around something, overshooting where it closes." />
<PreviewCard code title="marker" link="/reference/graphics/marker" src="previews/graphics/marker" text="A translucent highlighter stroke with ragged ends that sweeps across in sweep seconds (0 to show it at once)." />
<PreviewCard code title="strike" link="/reference/graphics/strike" src="previews/graphics/strike" text="A hand-drawn line through a word, slightly rising, to cross it out." />
</div>

## Progress

<div class="cc-cards">
<PreviewCard code title="progress-bar" link="/reference/graphics/progress-bar" src="previews/graphics/progress-bar" text="A bar that fills from from to to over the element's duration." />
<PreviewCard code title="countdown" link="/reference/graphics/countdown" src="previews/graphics/countdown" text="A ring that empties over the element's duration around the seconds left, counting down from from (default: the duration)." />
<PreviewCard code title="steps" link="/reference/graphics/steps" src="previews/graphics/steps" text="A row of dots for steps in a sequence, the active one (1-based) filled and larger." />
</div>

## Data

<div class="cc-cards">
<PreviewCard code title="counter" link="/reference/graphics/counter" src="previews/graphics/counter" text="A number that counts from from to to over countFor seconds, with an optional prefix, suffix and caption under it." />
<PreviewCard code title="unit-grid" link="/reference/graphics/unit-grid" src="previews/graphics/unit-grid" text="total units in a grid with filled of them coloured, one by one over fillFor seconds: &quot;7 in 10&quot;." />
<PreviewCard code title="comparison" link="/reference/graphics/comparison" src="previews/graphics/comparison" text="Bars side by side for a few values, each with its label and value, growing over growFor seconds." />
<PreviewCard code title="sample-size" link="/reference/graphics/sample-size" src="previews/graphics/sample-size" text="A field of dots for a sample of n, with share of them highlighted, appearing over appearFor seconds." />
</div>

## Dividers

<div class="cc-cards">
<PreviewCard code title="divider" link="/reference/graphics/divider" src="previews/graphics/divider" text="A rule between things: a line, a dotted line, a line with a diamond, or a line that fades at its ends." />
</div>

## Backgrounds

<div class="cc-cards">
<PreviewCard code title="gradient-background" link="/reference/graphics/gradient-background" src="previews/graphics/gradient-background" text="A full-frame linear or radial gradient between two colours." />
<PreviewCard code title="dots-background" link="/reference/graphics/dots-background" src="previews/graphics/dots-background" text="A full-frame grid of small dots on a solid colour." />
<PreviewCard code title="grid-background" link="/reference/graphics/grid-background" src="previews/graphics/grid-background" text="A full-frame grid of thin lines on a solid colour, like graph paper." />
<PreviewCard code title="waves-background" link="/reference/graphics/waves-background" src="previews/graphics/waves-background" text="Three soft waves in the palette's colours across the bottom of the frame, rising to level (a fraction of the height) and drifting at speed." />
<PreviewCard code title="blobs-background" link="/reference/graphics/blobs-background" src="previews/graphics/blobs-background" text="Large blurred colour fields that drift slowly: a soft, modern backdrop." />
</div>

## Effects

<div class="cc-cards">
<PreviewCard code title="confetti" link="/reference/graphics/confetti" src="previews/graphics/confetti" text="Confetti thrown up from the bottom centre that tumbles down across the frame over the element's duration." />
<PreviewCard code title="sparkles" link="/reference/graphics/sparkles" src="previews/graphics/sparkles" text="Four-pointed stars that twinkle in and out across the box." />
</div>

## Icons

<div class="cc-cards">
<PreviewCard code title="icon" link="/reference/graphics/icon" src="previews/graphics/icon" text="One of Lucide's line icons by name (check, arrow-right, sparkles, play, …), stroked in color, on an optional round or square plate." />
</div>
