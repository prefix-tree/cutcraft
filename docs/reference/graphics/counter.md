# Counter

::: warning Deprecated
`<Graphic>` and its kinds are deprecated and will be removed in a later release; the lint warns on each one. Draw the same thing with `<Motion>`, `<Three>` or a `<Layer>`: the [examples](/examples) show each, and [Free code](/guide/free-code) explains them.
:::

A number that counts from `from` to `to` over `countFor` seconds, with an optional prefix, suffix and caption under it. Animated: it changes over its whole duration.

<Example src="previews/graphics/counter" alt="Counter">

```tsx
<Composition fps={30} width={800} height={450}>
  <Track id="main" layout="free">
    <Graphic
      id="g1"
      kind="counter"
      to={1250}
      suffix="+"
      label="customers"
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
| `from` | number | `0` |
| `to` | number | `100` |
| `decimals` | integer | `0` |
| `prefix` | string | `""` |
| `suffix` | string | `""` |
| `label` | string | `""` |
| `countFor` | number (0..60) | `1.5` |
| `grouping` | boolean | `true` |
| `color` | string | `"$text"` |
| `labelColor` | string | `"$muted"` |
| `font` | string | `"$heading"` |
| `labelFont` | string | `"$body"` |

Plus the [`<Graphic>` props](/reference/elements/graphic) every kind takes. More in [Data](/reference/graphics/#data).
