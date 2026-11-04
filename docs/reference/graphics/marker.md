# Marker highlight

::: warning Deprecated
`<Graphic>` and its kinds are deprecated and will be removed in a later release; the lint warns on each one. Draw the same thing with `<Motion>`, `<Three>` or a `<Layer>`: the [examples](/examples) show each, and [Free code](/guide/free-code) explains them.
:::

A translucent highlighter stroke with ragged ends that sweeps across in `sweep` seconds (0 to show it at once). Put it under a title on a lower track. Animated: it changes over its whole duration.

<Example src="previews/graphics/marker" alt="Marker highlight">

```tsx
<Composition fps={30} width={640} height={360}>
  <Track id="main" layout="free">
    <Graphic
      id="g1"
      kind="marker"
      sweep={0}
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
| `color` | string | `"$accent"` |
| `opacity` | number (0..1) | `0.45` |
| `sweep` | number (0..30) | `0.5` |

Plus the [`<Graphic>` props](/reference/elements/graphic) every kind takes. More in [Highlights](/reference/graphics/#highlights).
