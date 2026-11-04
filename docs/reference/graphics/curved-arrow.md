# Curved arrow

::: warning Deprecated
`<Graphic>` and its kinds are deprecated and will be removed in a later release; the lint warns on each one. Draw the same thing with `<Motion>`, `<Three>` or a `<Layer>`: the [examples](/examples) show each, and [Free code](/guide/free-code) explains them.
:::

An arrow that arcs from the bottom left to the bottom right of its box; `flip` arcs it downward.

<Example src="previews/graphics/curved-arrow" alt="Curved arrow">

```tsx
<Composition fps={30} width={640} height={360}>
  <Track id="main" layout="free">
    <Graphic id="g1" kind="curved-arrow" start={0} duration={3} />
  </Track>
</Composition>
```

</Example>

## Props

| prop | type | default |
|---|---|---|
| `color` | string | `"$primary"` |
| `thickness` | number (0..200) | `8` |
| `bend` | number (0..1) | `0.7` |
| `flip` | boolean | `false` |
| `head` | "triangle" \| "open" \| "none" | `"triangle"` |

Plus the [`<Graphic>` props](/reference/elements/graphic) every kind takes. More in [Arrows](/reference/graphics/#arrows).
