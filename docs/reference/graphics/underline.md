# Underline scribble

A hand-drawn underline to put under a word. The `draw` entrance writes it on.

<Example src="previews/graphics/underline" alt="Underline scribble">

```tsx
<Composition fps={30} width={640} height={360}>
  <Track id="main" layout="free">
    <Graphic id="g1" kind="underline" start={0} duration={3} />
  </Track>
</Composition>
```

</Example>

## Props

| prop | type | default |
|---|---|---|
| `color` | string | `"$accent"` |
| `thickness` | number (0..100) | `8` |
| `wobble` | number (0..40) | `4` |
| `double` | boolean | `false` |

Plus the [`<Graphic>` props](/reference/elements#graphic) every kind takes. More in [Highlights](/reference/graphics/#highlights).
