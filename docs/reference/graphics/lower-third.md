# Lower third

::: warning Deprecated
`<Graphic>` and its kinds are deprecated and will be removed in a later release; the lint warns on each one. Draw the same thing with `<Motion>`, `<Three>` or a `<Layer>`: the [examples](/examples) show each, and [Free code](/guide/free-code) explains them.
:::

A name and a role on a panel with an accent bar at its left edge. Place it low on the left with `transform.position`.

<Example src="previews/graphics/lower-third" alt="Lower third">

```tsx
<Composition fps={30} width={640} height={360}>
  <Track id="main" layout="free">
    <Graphic id="g1" kind="lower-third" start={0} duration={3} />
  </Track>
</Composition>
```

</Example>

## Props

| prop | type | default |
|---|---|---|
| `name` | string | `"Jane Doe"` |
| `role` | string | `"Founder, Shed"` |
| `accent` | string | `"$primary"` |
| `fill` | string | `"$surface"` |
| `color` | string | `"$text"` |
| `muted` | string | `"$muted"` |
| `font` | string | `"$heading"` |
| `roleFont` | string | `"$body"` |
| `size` | number (0..400) | `44` |
| `weight` | integer | `700` |

Plus the [`<Graphic>` props](/reference/elements/graphic) every kind takes. More in [Lower thirds](/reference/graphics/#lower-thirds).
