---
"@uberscene/kit": minor
"@uberscene/sdk": minor
"@uberscene/player": minor
"@uberscene/render": patch
---

One way to style text: a title's look is one `style`, as the captions' is. `style` is a theme preset's name
(`style="h1"`) or an object of the look's fields, `font`, `size`, `weight`, `italic`, `color`, `background`, `stroke`,
`shadow`, `align`, `valign`, `lineHeight`, `letterSpacing` and `decoration`, with the same defaults as before. In an
object, `preset` names the preset it starts from and every field written beside it wins:
`style={{ preset: "h1", size: 64, color: "$primary" }}`. Those thirteen props are no longer written flat on `<Title>`,
and a title's text box, its flat `width` and `height`, is now its box's size, `box.width` and `box.height`. A Title
takes `id`, its timing, `box`, `transform`, `blend`, `enter`, `exit`, `style`, `animation` and its text.

The captions' `style` object takes `preset` too, where a preset's name used to replace the whole object, and their
flat `align` is now `style.align`. A theme preset for titles or captions is a look only: the built-in `note` preset no
longer carries a size, rounded corners or an entrance, and a field in a preset of your own that is not a look is
reported once, on the composition's `theme`, naming the preset and the field; it reaches no element and the rest of
the theme still applies. An unknown preset name is reported on `style.preset`.

Editing keeps up: `font/use` writes `style.font` (and `style.weight`) on a title as on the captions, turning
`style="h1"` into `{ preset: "h1", font }`, and no longer refuses captions styled by a preset name; `caption/setStyle`
takes a preset's name or an object. A `style` object with a key that is an expression, such as a font the file
declares (`style={{ font: brand, size: 64 }}`), locks only that key (`style.font`): the rest stays editable, and a key
that reads one of the file's props (`color: accent`) is bound as a whole prop is. The layout check suggests a smaller
`style.size` or a narrower `box.width` for a title.

To move a file, run `uberscene lint --fix video.tsx`. It folds a title's look props, and a `style` preset name beside
them, into one `style` object in the order the file wrote them (`style="h1" size={64}` becomes
`style={{ preset: "h1", size: 64 }}`), moves a title's `width` and `height` into its `box` (a new one, or the one it
has, before its `origin`), and moves the captions' `align` into their `style`. It cannot move a style built in code
(`style={LOOK}`, a spread) or a box that already sets its own size. A title that used the `note` preset now writes the
card's size, corners and entrance itself: `box={{ width: 840, height: 160 }}`, `transform={{ borderRadius: 28 }}` and
`animation={{ preset: "scale", in: 0.2, out: 0.15 }}` give what `note` drew before.
