# Burst

A starburst sticker with a word on it, for prices, offers and shouts.

<Example src="previews/graphics/burst" alt="Burst">

```tsx
<Composition fps={30} width={640} height={360}>
  <Track id="main" layout="free">
    <Graphic
      id="g1"
      kind="burst"
      text="-50%"
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
| `text` | string | `"SALE"` |
| `color` | string | `"$onPrimary"` |
| `font` | string | `"$heading"` |
| `size` | number (0..400) | `44` |
| `weight` | integer | `700` |
| `fill` | string | `"$accent"` |
| `points` | integer | `18` |
| `depth` | number (0..1) | `0.16` |

Plus the [`<Graphic>` props](/reference/elements/graphic) every kind takes. More in [Callouts](/reference/graphics/#callouts).
