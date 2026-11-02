# Frame

A rounded border around a region, solid or dashed.

<Example src="previews/graphics/frame" alt="Frame">

```tsx
<Composition fps={30} width={640} height={360}>
  <Track id="main" layout="free">
    <Graphic
      id="g1"
      kind="frame"
      dashed={true}
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
| `color` | string | `"$primary"` |
| `thickness` | number (0..100) | `6` |
| `radius` | number (0..∞) \| string | `"$radius"` |
| `dashed` | boolean | `false` |

Plus the [`<Graphic>` props](/reference/elements#graphic) every kind takes. More in [Frames](/reference/graphics/#frames).
