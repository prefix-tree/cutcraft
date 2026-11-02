# Blobs background

Large blurred colour fields that drift slowly: a soft, modern backdrop. `seed` picks another arrangement. Animated: it changes over its whole duration.

<Example src="previews/graphics/blobs-background" alt="Blobs background">

```tsx
<Composition fps={30} width={640} height={360}>
  <Track id="main" layout="free">
    <Graphic
      id="g1"
      kind="blobs-background"
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
| `blur` | number (0..400) | `120` |
| `speed` | number (0..10) | `0.2` |
| `seed` | integer |  |

Plus the [`<Graphic>` props](/reference/elements#graphic) every kind takes. More in [Backgrounds](/reference/graphics/#backgrounds).
