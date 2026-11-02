# 0016. A theme lives in the file

## Context

Videos made from cut files looked assembled, not designed. Each file repeated
its colours and fonts as literals, recipes passed an `accent` prop around, and
Title's `style` prop was read by nothing. The goal is the one design tools
serve with a brand kit and text styles: one consistent look across a video,
changed in one place. The model is the first author, so the look has to be
something it writes, not something configured beside the file.

Three places could hold it: the file, the asset manifest, or the host
application (a provider around the player). The manifest describes media, not
intent. A provider would make the file render differently depending on who
renders it, and the export runs without the host's React tree.

## Decision

- **The theme is a prop of the composition.** Its `theme` object holds
  `extends`, `palette`, `fonts`, `radius`, `motion` and `styles`, validated by
  the composition's schema.
  The file stays the video (0001): the preview, the export and a re-read of the
  file give the same result, and the theme folds back as a literal like any
  other prop.
- **Built-ins are a starting point, not a dependency.** Six named themes and
  five motion styles live in `@cutcraft/kit`. `extends` picks one; the file's
  palette, fonts and presets merge over it. A file with no theme renders as it
  did before: tokens resolve against the default theme, but no preset or
  motion is applied that the file did not ask for.
- **The resolver applies the theme before the schema parses props.** Tokens
  (`$primary`, `$heading`, `$radius`) become values, the named or `default`
  preset fills the props the element leaves out, and the motion style fills
  `enter`, `exit` and a transition's type and length. The element's own props
  always win. Renderers see plain values and need no theme logic, except that
  SVG markup gets the tokens so model-written graphics can use them.
- **Nothing is written into the file by resolving.** Each placement records in
  `themed` which props the theme supplied and from where, so the editor can
  show what follows the theme and what was set by hand.
- **Identity survives a theme change** where the theme does not reach. An
  element whose props the theme touches under neither the old nor the new
  theme keeps its parsed props and its placement (0011).
- **Fonts ship with the renderers.** A theme is only as good as the faces it
  names, so five OFL families are bundled in both the export (Satori reads the
  `@fontsource` files) and the preview (`@cutcraft/player/fonts.css`).

## Consequences

- Swapping a theme restyles a whole video with one action
  (`composition/setTheme`); one token with `theme/setToken`.
- The model gets a smaller job: set a theme, use tokens and presets, and leave
  colours and fonts out of elements. The `theme-literals` lint says when it did
  not.
- Presets are untyped bags of props validated where they are used: a bad prop
  in a preset shows up as a schema error on the elements that use it.
- Only crossfade transitions render today, so motion styles differ in
  transition length, not type.
