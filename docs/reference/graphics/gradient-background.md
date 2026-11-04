# Gradient background

::: warning Deprecated
`<Graphic>` and its kinds are deprecated and will be removed in a later release; the lint warns on each one. Draw the same thing with `<Motion>`, `<Three>` or a `<Layer>`: the [examples](/examples) show each, and [Free code](/guide/free-code) explains them.
:::

A full-frame linear or radial gradient between two colours. Put it on the lowest track.

<Example src="previews/graphics/gradient-background" alt="Gradient background">

```tsx
<Composition fps={30} width={640} height={360}>
  <Track id="main" layout="free">
    <Graphic
      id="g1"
      kind="gradient-background"
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
| `from` | string | `"$background"` |
| `to` | string | `"$primary"` |
| `type` | "linear" \| "radial" | `"linear"` |
| `angle` | number | `135` |

Plus the [`<Graphic>` props](/reference/elements/graphic) every kind takes. More in [Backgrounds](/reference/graphics/#backgrounds).
