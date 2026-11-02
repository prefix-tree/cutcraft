# Hand-drawn arrow

A loose, marker-drawn arrow with a slight curve. The `draw` entrance traces it.

<Example src="previews/graphics/hand-arrow" alt="Hand-drawn arrow">

```tsx
<Composition fps={30} width={640} height={360}>
  <Track id="main" layout="free">
    <Graphic id="g1" kind="hand-arrow" start={0} duration={3} />
  </Track>
</Composition>
```

</Example>

## Props

| prop | type | default |
|---|---|---|
| `color` | string | `"$accent"` |
| `thickness` | number (0..200) | `7` |
| `wobble` | number (0..50) | `5` |

Plus the [`<Graphic>` props](/reference/elements#graphic) every kind takes. More in [Arrows](/reference/graphics/#arrows).
