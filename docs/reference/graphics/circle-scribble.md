# Circle scribble

A loose hand-drawn loop around something, overshooting where it closes.

<Example src="previews/graphics/circle-scribble" alt="Circle scribble">

```tsx
<Composition fps={30} width={640} height={360}>
  <Track id="main" layout="free">
    <Graphic
      id="g1"
      kind="circle-scribble"
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
| `color` | string | `"$accent"` |
| `thickness` | number (0..100) | `7` |
| `wobble` | number (0..60) | `6` |

Plus the [`<Graphic>` props](/reference/elements#graphic) every kind takes. More in [Highlights](/reference/graphics/#highlights).
