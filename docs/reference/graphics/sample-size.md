# Sample size

::: warning Deprecated
`<Graphic>` and its kinds are deprecated and will be removed in a later release; the lint warns on each one. Draw the same thing with `<Motion>`, `<Three>` or a `<Layer>`: the [examples](/examples) show each, and [Free code](/guide/free-code) explains them.
:::

A field of dots for a sample of `n`, with `share` of them highlighted, appearing over `appearFor` seconds. Past 1,000 each dot stands for several (`perDot`), and the note says so. The label may use `{n}` and `{share}`. Animated: it changes over its whole duration.

<Example src="previews/graphics/sample-size" alt="Sample size">

```tsx
<Composition fps={30} width={640} height={360}>
  <Track id="main" layout="free">
    <Graphic
      id="g1"
      kind="sample-size"
      n={1200}
      share={0.38}
      label="{share} of {n} said yes"
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
| `n` | integer (1..10000000) | `1200` |
| `share` | number (0..1) |  |
| `perDot` | integer (1..∞) |  |
| `layout` | "grid" \| "scatter" | `"grid"` |
| `appearFor` | number (0..60) | `1.5` |
| `label` | string | `"n = {n}"` |
| `color` | string | `"$muted"` |
| `highlight` | string | `"$primary"` |
| `labelColor` | string | `"$text"` |
| `font` | string | `"$body"` |

Plus the [`<Graphic>` props](/reference/elements/graphic) every kind takes. More in [Data](/reference/graphics/#data).
