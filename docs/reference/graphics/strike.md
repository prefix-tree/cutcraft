# Strike-through

A hand-drawn line through a word, slightly rising, to cross it out.

<Example src="previews/graphics/strike" alt="Strike-through">

```tsx
<Composition fps={30} width={640} height={360}>
  <Track id="main" layout="free">
    <Graphic id="g1" kind="strike" start={0} duration={3} />
  </Track>
</Composition>
```

</Example>

## Props

| prop | type | default |
|---|---|---|
| `color` | string | `"$accent"` |
| `thickness` | number (0..100) | `8` |
| `wobble` | number (0..40) | `3` |

Plus the [`<Graphic>` props](/reference/elements/graphic) every kind takes. More in [Highlights](/reference/graphics/#highlights).
