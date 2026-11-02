# Dot grid background

A full-frame grid of small dots on a solid colour; `drift` scrolls it (pixels per second). Animated: it changes over its whole duration.

<Example src="previews/graphics/dots-background" alt="Dot grid background">

```tsx
<Composition fps={30} width={640} height={360}>
  <Track id="main" layout="free">
    <Graphic
      id="g1"
      kind="dots-background"
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
| `gap` | number (0..400) | `40` |
| `radius` | number (0..100) | `3` |
| `opacity` | number (0..1) | `0.5` |
| `drift` | number (-1000..1000) | `0` |

Plus the [`<Graphic>` props](/reference/elements/graphic) every kind takes. More in [Backgrounds](/reference/graphics/#backgrounds).
