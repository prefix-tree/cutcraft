# Speech bubble

::: warning Deprecated
`<Graphic>` and its kinds are deprecated and will be removed in a later release; the lint warns on each one. Draw the same thing with `<Motion>`, `<Three>` or a `<Layer>`: the [examples](/examples) show each, and [Free code](/guide/free-code) explains them.
:::

A round comic-style bubble with a tail to one side below it.

<Example src="previews/graphics/speech-bubble" alt="Speech bubble">

```tsx
<Composition fps={30} width={640} height={360}>
  <Track id="main" layout="free">
    <Graphic
      id="g1"
      kind="speech-bubble"
      text="Hi there!"
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
| `text` | string | `"Hi there!"` |
| `color` | string | `"#111111"` |
| `font` | string | `"$body"` |
| `size` | number (0..400) | `36` |
| `weight` | integer | `700` |
| `fill` | string | `"#ffffff"` |
| `border` | string | `"#111111"` |
| `borderWidth` | number (0..50) | `4` |
| `tail` | "left" \| "right" | `"left"` |

Plus the [`<Graphic>` props](/reference/elements/graphic) every kind takes. More in [Callouts](/reference/graphics/#callouts).
