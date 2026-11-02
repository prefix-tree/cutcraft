# Gradient background

A full-frame linear or radial gradient between two colours. Put it on the lowest track.

<Example src="previews/graphics/gradient-background" alt="Gradient background">

```tsx
<Composition fps={30} width={640} height={360}>
  <Track id="main" layout="free">
    <Graphic
      id="g1"
      kind="gradient-background"
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
| `from` | string | `"$background"` |
| `to` | string | `"$primary"` |
| `type` | "linear" \| "radial" | `"linear"` |
| `angle` | number | `135` |

Plus the [`<Graphic>` props](/reference/elements#graphic) every kind takes. More in [Backgrounds](/reference/graphics/#backgrounds).
