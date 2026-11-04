# Divider

::: warning Deprecated
`<Graphic>` and its kinds are deprecated and will be removed in a later release; the lint warns on each one. Draw the same thing with `<Motion>`, `<Three>` or a `<Layer>`: the [examples](/examples) show each, and [Free code](/guide/free-code) explains them.
:::

A rule between things: a line, a dotted line, a line with a diamond, or a line that fades at its ends.

<Example src="previews/graphics/divider" alt="Divider">

```tsx
<Composition fps={30} width={800} height={450}>
  <Track id="main" layout="free">
    <Graphic
      id="g1"
      kind="divider"
      variant="diamond"
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
| `variant` | "line" \| "dots" \| "diamond" \| "fade" | `"line"` |
| `color` | string | `"$muted"` |
| `thickness` | number (0..100) | `4` |

Plus the [`<Graphic>` props](/reference/elements/graphic) every kind takes. More in [Dividers](/reference/graphics/#dividers).
