# Badge

::: warning Deprecated
`<Graphic>` and its kinds are deprecated and will be removed in a later release; the lint warns on each one. Draw the same thing with `<Motion>`, `<Three>` or a `<Layer>`: the [examples](/examples) show each, and [Free code](/guide/free-code) explains them.
:::

A round badge with a short word or two, and a ring inside its edge.

<Example src="previews/graphics/badge" alt="Badge">

```tsx
<Composition fps={30} width={640} height={360}>
  <Track id="main" layout="free">
    <Graphic
      id="g1"
      kind="badge"
      text="NEW"
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
| `text` | string | `"NEW"` |
| `color` | string | `"$onPrimary"` |
| `font` | string | `"$heading"` |
| `size` | number (0..400) | `40` |
| `weight` | integer (100..900) | `700` |
| `fill` | string | `"$accent"` |
| `ring` | boolean | `true` |

Plus the [`<Graphic>` props](/reference/elements/graphic) every kind takes. More in [Callouts](/reference/graphics/#callouts).
