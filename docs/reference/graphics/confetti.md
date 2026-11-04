# Confetti

::: warning Deprecated
`<Graphic>` and its kinds are deprecated and will be removed in a later release; the lint warns on each one. Draw the same thing with `<Motion>`, `<Three>` or a `<Layer>`: the [examples](/examples) show each, and [Free code](/guide/free-code) explains them.
:::

Confetti thrown up from the bottom centre that tumbles down across the frame over the element's duration. Animated: it changes over its whole duration.

<Example src="previews/graphics/confetti" alt="Confetti">

```tsx
<Composition fps={30} width={640} height={360}>
  <Track id="main" layout="free">
    <Graphic id="g1" kind="confetti" start={0} duration={3} />
  </Track>
</Composition>
```

</Example>

## Props

| prop | type | default |
|---|---|---|
| `colors` | string[] | `["$primary","$secondary","$accent"]` |
| `count` | integer | `90` |
| `spread` | number (0..1) | `0.7` |
| `seed` | integer |  |

Plus the [`<Graphic>` props](/reference/elements/graphic) every kind takes. More in [Effects](/reference/graphics/#effects).
