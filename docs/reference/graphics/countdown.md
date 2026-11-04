# Countdown

::: warning Deprecated
`<Graphic>` and its kinds are deprecated and will be removed in a later release; the lint warns on each one. Draw the same thing with `<Motion>`, `<Three>` or a `<Layer>`: the [examples](/examples) show each, and [Free code](/guide/free-code) explains them.
:::

A ring that empties over the element's duration around the seconds left, counting down from `from` (default: the duration). Animated: it changes over its whole duration.

<Example src="previews/graphics/countdown" alt="Countdown">

```tsx
<Composition fps={30} width={640} height={360}>
  <Track id="main" layout="free">
    <Graphic
      id="g1"
      kind="countdown"
      from={5}
      start={0}
      duration={3}
    />
  </Track>
</Composition>
```

</Example>

## Props

| prop | type | default |
|---|---|---|
| `from` | integer |  |
| `color` | string | `"$primary"` |
| `track` | string | `"$surface"` |
| `textColor` | string | `"$text"` |
| `font` | string | `"$heading"` |
| `thickness` | number (0..200) | `14` |

Plus the [`<Graphic>` props](/reference/elements/graphic) every kind takes. More in [Progress](/reference/graphics/#progress).
