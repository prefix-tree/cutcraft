# Components

Ready-made pieces: lower thirds, callouts, counters and the like. Each is an ordinary function that returns the kit's own elements (titles, shapes, SVG, a layer where something moves every frame), so it is timed by words, styled by the theme and checked like any element. Editing one of its parts in the editor writes that use out into the file as plain elements. Import them from `@cutcraft/kit`. Generated from `packages/kit/src/components` by `pnpm docs:gen`.

<div class="cc-cards">
<PreviewCard code hover title="LowerThird" link="/reference/components/lower-third" src="previews/components/lower-third" text="A name and a role in the lower third, on a card or beside an accent bar." />
<PreviewCard code hover title="Callout" link="/reference/components/callout" src="previews/components/callout" text="A note in a box, with a line drawn to what it is about." />
<PreviewCard code hover title="Badge" link="/reference/components/badge" src="previews/components/badge" text="A short word on a pill that pops in." />
<PreviewCard code hover title="Counter" link="/reference/components/counter" src="previews/components/counter" text="A number that counts to its value, with a label." />
<PreviewCard code hover title="ProgressBar" link="/reference/components/progress-bar" src="previews/components/progress-bar" text="A bar that fills from the left to its value." />
<PreviewCard code hover title="Arrow" link="/reference/components/arrow" src="previews/components/arrow" text="An arrow drawn from one point to another, straight or bowed." />
<PreviewCard code hover title="Highlight" link="/reference/components/highlight" src="previews/components/highlight" text="A hand-drawn underline, marker stroke, circle or strike on something in the frame." />
<PreviewCard code hover title="Background" link="/reference/components/background" src="previews/components/background" text="A full-frame gradient, dots or grid to put beneath everything." />
</div>

Positions are pixels from the frame's centre, as every element's `transform.position`, and the defaults suit a 1920x1080 frame. Colours default to theme tokens (`$primary`, `$surface`, `$text`), so a theme restyles them. Every component takes the timing props any element takes: `start`, or `anchor` with `at` and `offset`, and `duration`.
