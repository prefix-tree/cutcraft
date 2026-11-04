# Icon

::: warning Deprecated
`<Graphic>` and its kinds are deprecated and will be removed in a later release; the lint warns on each one. Draw the same thing with `<Motion>`, `<Three>` or a `<Layer>`: the [examples](/examples) show each, and [Free code](/guide/free-code) explains them.
:::

One of Lucide's line icons by name (`check`, `arrow-right`, `sparkles`, `play`, …), stroked in `color`, on an optional round or square plate.

<Example src="previews/graphics/icon" alt="Icon">

```tsx
<Composition fps={30} width={640} height={360}>
  <Track id="main" layout="free">
    <Graphic
      id="g1"
      kind="icon"
      name="sparkles"
      plate="circle"
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
| `name` | string |  |
| `color` | string | `"$text"` |
| `strokeWidth` | number (0.25..6) | `2` |
| `plate` | "none" \| "circle" \| "square" | `"none"` |
| `plateColor` | string | `"$surface"` |

Plus the [`<Graphic>` props](/reference/elements/graphic) every kind takes. More in [Icons](/reference/graphics/#icons).
