# Sparkles

::: warning Deprecated
`<Graphic>` and its kinds are deprecated and will be removed in a later release; the lint warns on each one. Draw the same thing with `<Motion>`, `<Three>` or a `<Layer>`: the [examples](/examples) show each, and [Free code](/guide/free-code) explains them.
:::

Four-pointed stars that twinkle in and out across the box. Size the box to the area that should sparkle. Animated: it changes over its whole duration.

<Example src="previews/graphics/sparkles" alt="Sparkles">

```tsx
<Composition fps={30} width={640} height={360}>
  <Track id="main" layout="free">
    <Graphic id="g1" kind="sparkles" start={0} duration={3} />
  </Track>
</Composition>
```

</Example>

## Props

| prop | type | default |
|---|---|---|
| `colors` | string[] | `["#ffffff","$accent"]` |
| `count` | integer (1..200) | `14` |
| `size` | number (2..400) | `28` |
| `speed` | number (0..10) | `1.2` |
| `seed` | integer |  |

Plus the [`<Graphic>` props](/reference/elements/graphic) every kind takes. More in [Effects](/reference/graphics/#effects).
