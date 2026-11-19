---
editLink: false
---

# Components

Ready-made pieces: lower thirds, callouts, counters, cards and the like. Import them from `@uberscene/kit` and write them on a track like any element. Generated from `packages/kit/src/components` by `pnpm docs:gen`.

<div class="cc-cards">
<PreviewCard code hover title="LowerThird" link="/reference/components/lower-third" src="previews/components/lower-third" text="A name and a role in the lower third, on a card or beside an accent bar." />
<PreviewCard code hover title="Callout" link="/reference/components/callout" src="previews/components/callout" text="A note in a box, with a line drawn to what it is about." />
<PreviewCard code hover title="Badge" link="/reference/components/badge" src="previews/components/badge" text="A short word on a pill that pops in." />
<PreviewCard code hover title="Counter" link="/reference/components/counter" src="previews/components/counter" text="A number that counts to its value, with a label." />
<PreviewCard code hover title="ProgressBar" link="/reference/components/progress-bar" src="previews/components/progress-bar" text="A bar that fills from the left to its value." />
<PreviewCard code hover title="Arrow" link="/reference/components/arrow" src="previews/components/arrow" text="An arrow drawn from one point to another, straight or bowed." />
<PreviewCard code hover title="Highlight" link="/reference/components/highlight" src="previews/components/highlight" text="A hand-drawn underline, marker stroke, circle or strike on something in the frame." />
<PreviewCard code hover title="Background" link="/reference/components/background" src="previews/components/background" text="A full-frame gradient, dots or grid to put beneath everything." />
<PreviewCard code hover title="TypeCard" link="/reference/components/type-card" src="previews/components/type-card" text="A card of big type that builds line by line, with pills and struck-out lines." />
<PreviewCard code hover title="QuoteCard" link="/reference/components/quote-card" src="previews/components/quote-card" text="A passage on a paper card with its source, and a marker over the phrases that matter." />
<PreviewCard code hover title="Frame" link="/reference/components/frame" src="previews/components/frame" text="A rounded border around part of the picture." />
</div>

## Anatomy of a component

A component is an ordinary function that returns the kit's own elements: titles, shapes, SVG, and a layer where something moves every frame. So it behaves like the elements it is made of.

```tsx
<LowerThird id="name" start={0.5} duration={4} name="Maya Chen" role="Head roaster, Halvard" />
```

| Part | How it works |
|---|---|
| `id` | Names the component. Each element it makes has an id that starts with it: `name-card`, `name-bar`, `name-name`, `name-role`. |
| Timing | The same props as any element: `start`, or `anchor` with `at` and `offset`, and `duration`, including `{ until: id }`. Its parts come in and go out inside that time. |
| Position | `x` and `y` are pixels from the frame's centre, as every element's `transform.position`. The defaults suit a 1920x1080 frame. |
| Look | Colours default to theme tokens (`$primary`, `$surface`, `$text`) and text to the theme's fonts, so a theme restyles every component. |
| Its own props | The words and options it draws, listed on its page: `name` and `role` for a lower third, `to` and `format` for a counter. |
| In an editor | Its props are editable in an inspector. Editing one of its parts writes that use out into the file as plain elements, and the edit applies to them. |

Any function that returns elements works the same way, so you can write your own ([Helpers](/guide/the-file#helpers)). [Anatomy of an element](/guide/elements) covers the parts every element shares.
