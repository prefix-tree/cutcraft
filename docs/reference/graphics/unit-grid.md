# Unit grid

::: warning Deprecated
`<Graphic>` and its kinds are deprecated and will be removed in a later release; the lint warns on each one. Draw the same thing with `<Motion>`, `<Three>` or a `<Layer>`: the [examples](/examples) show each, and [Free code](/guide/free-code) explains them.
:::

`total` units in a grid with `filled` of them coloured, one by one over `fillFor` seconds: "7 in 10". A fractional `filled` colours part of the last unit. Animated: it changes over its whole duration.

<Example src="previews/graphics/unit-grid" alt="Unit grid">

```tsx
<Composition fps={30} width={640} height={360}>
  <Track id="main" layout="free">
    <Graphic
      id="g1"
      kind="unit-grid"
      total={10}
      filled={7}
      label="7 in 10 viewers"
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
| `total` | integer | `10` |
| `filled` | number (0..400) | `3` |
| `columns` | integer |  |
| `unit` | "person" \| "circle" \| "square" | `"person"` |
| `gap` | number (0..0.8) | `0.25` |
| `fillFor` | number (0..60) | `1` |
| `label` | string | `""` |
| `color` | string | `"$primary"` |
| `empty` | string | `"$surface"` |
| `labelColor` | string | `"$text"` |
| `font` | string | `"$body"` |

Plus the [`<Graphic>` props](/reference/elements/graphic) every kind takes. More in [Data](/reference/graphics/#data).
