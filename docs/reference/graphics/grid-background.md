# Grid background

A full-frame grid of thin lines on a solid colour, like graph paper.

<Example src="previews/graphics/grid-background" alt="Grid background">

```tsx
<Composition fps={30} width={640} height={360}>
  <Track id="main" layout="free">
    <Graphic
      id="g1"
      kind="grid-background"
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
| `background` | string | `"$background"` |
| `color` | string | `"$muted"` |
| `gap` | number (0..800) | `80` |
| `thickness` | number (0..20) | `1` |
| `opacity` | number (0..1) | `0.25` |

Plus the [`<Graphic>` props](/reference/elements#graphic) every kind takes. More in [Backgrounds](/reference/graphics/#backgrounds).
