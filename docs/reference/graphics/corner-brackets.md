# Corner brackets

::: warning Deprecated
`<Graphic>` and its kinds are deprecated and will be removed in a later release; the lint warns on each one. Draw the same thing with `<Motion>`, `<Three>` or a `<Layer>`: the [examples](/examples) show each, and [Free code](/guide/free-code) explains them.
:::

Four corner marks framing a region, like a viewfinder. Size it to the region it frames.

<Example src="previews/graphics/corner-brackets" alt="Corner brackets">

```tsx
<Composition fps={30} width={640} height={360}>
  <Track id="main" layout="free">
    <Graphic
      id="g1"
      kind="corner-brackets"
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
| `color` | string | `"$primary"` |
| `thickness` | number (0..100) | `8` |
| `length` | number (0..0.5) | `0.16` |

Plus the [`<Graphic>` props](/reference/elements/graphic) every kind takes. More in [Frames](/reference/graphics/#frames).
