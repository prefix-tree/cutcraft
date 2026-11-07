# Step dots

::: warning Deprecated
`<Graphic>` and its kinds are deprecated and will be removed in a later release; the lint warns on each one. Draw the same thing with `<Motion>`, `<Three>` or a `<Layer>`: the [examples](/examples) show each, and [Free code](/guide/free-code) explains them.
:::

A row of dots for steps in a sequence, the `active` one (1-based) filled and larger.

<Example src="previews/graphics/steps" alt="Step dots">

```tsx
<Composition fps={30} width={640} height={360}>
  <Track id="main" layout="free">
    <Graphic
      id="g1"
      kind="steps"
      count={4}
      active={2}
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
| `count` | integer (2..20) | `5` |
| `active` | integer (0..20) | `1` |
| `color` | string | `"$primary"` |
| `inactive` | string | `"$muted"` |
| `line` | boolean | `true` |

Plus the [`<Graphic>` props](/reference/elements/graphic) every kind takes. More in [Progress](/reference/graphics/#progress).
