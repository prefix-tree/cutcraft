# Arrow

A straight arrow across its box, pointing right; turn it with `transform.rotation`.

<Example src="previews/graphics/arrow" alt="Arrow">

```tsx
<Composition fps={30} width={640} height={360}>
  <Track id="main" layout="free">
    <Graphic
      id="g1"
      kind="arrow"
      thickness={12}
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
| `thickness` | number (0..200) | `10` |
| `head` | "triangle" \| "open" \| "none" | `"triangle"` |
| `tail` | "none" \| "dot" | `"none"` |

Plus the [`<Graphic>` props](/reference/elements/graphic) every kind takes. More in [Arrows](/reference/graphics/#arrows).
