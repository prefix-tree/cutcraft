# Sample size

A field of dots for a sample of `n`, with `share` of them highlighted, appearing over `appearFor` seconds. Past 1,000 each dot stands for several (`perDot`), and the note says so. The label may use `{n}` and `{share}`. Animated: it changes over its whole duration.

<Example src="previews/graphics/sample-size" alt="Sample size">

```tsx
<Composition fps={30} width={640} height={360}>
  <Track id="main" layout="free">
    <Graphic
      id="g1"
      kind="sample-size"
      n={1200}
      share={0.38}
      label="{share} of {n} said yes"
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
| `n` | integer | `1200` |
| `share` | number (0..1) |  |
| `perDot` | integer |  |
| `layout` | "grid" \| "scatter" | `"grid"` |
| `appearFor` | number (0..60) | `1.5` |
| `label` | string | `"n = {n}"` |
| `color` | string | `"$muted"` |
| `highlight` | string | `"$primary"` |
| `labelColor` | string | `"$text"` |
| `font` | string | `"$body"` |

Plus the [`<Graphic>` props](/reference/elements#graphic) every kind takes. More in [Data](/reference/graphics/#data).
