# Themes and style

A theme gives a whole video one look: a palette, fonts, a corner radius, a
motion style and named presets per element, the way a brand kit and text
styles do in a design tool. It lives in the file, on the composition, so the
model writes it, the editor changes it with one undoable action, and swapping
it restyles every element that uses it without touching the edit.

```tsx
<Composition fps={30} width={1920} height={1080}
  theme={{
    extends: "midnight",
    palette: { primary: "#ff5a1f" },
    fonts: { heading: "Playfair Display" },
    motion: "snappy",
    styles: { title: { hero: { size: 120, weight: 700, color: "$primary" } } },
  }}>
  <Track id="main">…</Track>
  <Track id="graphics" layout="free">
    <Title id="kicker" start={0.5} style="kicker">NEW</Title>
    <Title id="name" start={0.5} style="hero">Shed</Title>
    <Shape id="card" start={0.5} shape="rectangle" width={720} height={180} style="card" />
    <Svg id="mark" start={1} content={'<svg viewBox="0 0 24 24"><path d="…" fill="$accent"/></svg>'} />
  </Track>
</Composition>
```

## What a theme holds

| Part | What it is | Used as |
|---|---|---|
| `extends` | A built-in theme to start from: `midnight` (the default), `paper`, `neon`, `pastel`, `mono`, `bold` |  |
| `palette` | Colours by name, merged over the base: `primary`, `secondary`, `accent`, `background`, `surface`, `text`, `muted`, `onPrimary`, and any names you add | `$primary`, `$brand` |
| `fonts` | Families by role: `heading`, `body`, `mono` | `$heading`, `$body`, `$mono` |
| `radius` | Corner radius in pixels | `$radius` |
| `motion` | `none`, `calm`, `snappy`, `bouncy`, `editorial`, or `{ enter, exit, transition }` | fills entrances, exits and transitions |
| `styles` | Named presets per kind (`title`, `shape`, `svg`, `sticker`, `graphic`, `captions`), merged over the base's | `style="h1"` |

Tokens and preset names share one namespace per theme; the schema rejects a
font role with the name of a palette colour.

## Tokens

A prop whose whole value is `$name` takes that theme value: colours
(`color="$text"`, `fill="$surface"`, gradient stops, strokes, caption styles,
markers, the composition background), fonts (`font="$heading"`) and lengths
(`cornerRadius="$radius"`, `transform.borderRadius`). Inside SVG markup, write
`$name` or `var(--cc-name, fallback)` in attributes and styles.

Tokens resolve against the default theme when the file declares none, so
`$primary` always means something. An unknown token is a resolve error
(`UNKNOWN_TOKEN`) and a lint error (`theme-refs`).

## Presets

`style="name"` lays the kind's preset under the element's own props: the
element's props always win, so `<Title style="h1" color="#fff">` is an h1 in
white. With a declared theme, the kind's `default` preset applies to every
element of that kind that names none; that is how a theme's heading font and
text colour reach plain titles. Without a declared theme, nothing changes for
an element that does not ask.

The built-in themes share one set of presets, written in tokens:

| Kind | Presets |
|---|---|
| title | `default`, `h1`, `h2`, `kicker`, `body`, `caption`, `quote`, `label`, `code` |
| shape | `default` (fill `$primary`), `card` (surface, radius, soft shadow), `panel`, `pill`, `outline`, `accent`, `backdrop` |
| captions | `default`, `boxed`, `bold` (`style="boxed"` on `<Captions>`) |

## Motion

The motion style fills what the file leaves out: `enter` and `exit` on titles,
shapes, SVG, stickers and graphics (a title with a text `animation` keeps it instead),
and the `type` and `duration` of a `<Transition>`. To keep one element still, give it an
`enter` of type `none`.

| Style | Enter | Exit | Transitions |
|---|---|---|---|
| `calm` | fade, 0.8 s | fade, 0.6 s | crossfade, 0.8 s |
| `snappy` | slide up, 0.35 s | fade, 0.2 s | crossfade, 0.25 s |
| `bouncy` | pop, 0.5 s | scale, 0.3 s | crossfade, 0.4 s |
| `editorial` | wipe right, 0.6 s | wipe right, 0.4 s | crossfade, 0.5 s |

## Backgrounds beneath the footage

Overlays draw above the footage, so a background graphic on top of a clip
would hide it. Put a background on a track **below every track that holds
footage**: overlays there draw beneath the footage, in the preview and the
export alike, and the composition background goes under them.

```tsx
<Track id="backdrop" layout="free">
  <Graphic id="blobs" kind="blobs-background" start={0} duration={12} />
</Track>
<Track id="main">…clips…</Track>
<Track id="notes" layout="free">…callouts above the footage…</Track>
```

Footage that blends (`blend="multiply"`, say) blends with the clips beneath it,
not with the backdrop.

## Fonts

Five families ship with both renderers, all under the SIL Open Font License:
Inter, Space Grotesk, Playfair Display, DM Sans and JetBrains Mono, in regular
and bold (and italic, except Space Grotesk). The export reads them from the
`@fontsource` packages; the preview loads them once the app imports
`@cutcraft/player/fonts.css`. Another family works in the preview if the page
loads it, and in the export if you pass it (`--font`, `fonts`); otherwise the
export sets it in Inter and warns. The `font-available` lint names such fonts.

## Seeing where a value came from

A placement's `themed` maps each prop the theme supplied to its origin:
`"$primary"` for a token, `"style:h1"` for a preset, `"motion"` for the motion
style, `"theme"` for the composition background. The inspector reads it to
show which values follow the theme.

## Changing the theme

| Action | Does |
|---|---|
| `composition/setTheme` `{ theme, merge? }` | Replaces the theme (or removes it with `null`); with `merge`, lays the parts over the current one |
| `theme/setToken` `{ token, value }` | Sets one palette colour, font role or `radius` |

Both fold into the composition's `theme` literal and undo in one step. Elements
the theme does not touch keep their placements, so a swap re-renders only what
it restyles.

## Lint

- `theme-refs` (error): a `$token` the theme does not define, or a `style`
  with no preset.
- `theme-literals` (warning): with a theme declared, a literal colour or font
  on a title, shape, SVG, sticker, captions or marker. Shadows are exempt.
  The message names the token when the colour matches one.
- `font-available` (warning): a font no renderer ships.
