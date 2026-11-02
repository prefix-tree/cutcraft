# Waves background

Three soft waves in the palette's colours across the bottom of the frame, rising to `level` (a fraction of the height) and drifting at `speed`. Animated: it changes over its whole duration.

<Example src="previews/graphics/waves-background" alt="Waves background">

```tsx
<Composition fps={30} width={640} height={360}>
  <Track id="main" layout="free">
    <Graphic
      id="g1"
      kind="waves-background"
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
| `colors` | string[] | `["$primary","$secondary","$accent"]` |
| `level` | number (0..1) | `0.45` |
| `speed` | number (0..10) | `0.3` |

Plus the [`<Graphic>` props](/reference/elements/graphic) every kind takes. More in [Backgrounds](/reference/graphics/#backgrounds).
