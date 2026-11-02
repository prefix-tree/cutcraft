# Pill

A fully rounded label, with an optional dot before the text (a live indicator, a status).

<Example src="previews/graphics/pill" alt="Pill">

```tsx
<Composition fps={30} width={640} height={360}>
  <Track id="main" layout="free">
    <Graphic
      id="g1"
      kind="pill"
      text="Live"
      dot="#ff3b30"
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
| `text` | string | `"Live"` |
| `color` | string | `"$onPrimary"` |
| `font` | string | `"$body"` |
| `size` | number (0..400) | `28` |
| `weight` | integer | `700` |
| `fill` | string | `"$primary"` |
| `dot` | string | `"none"` |

Plus the [`<Graphic>` props](/reference/elements#graphic) every kind takes. More in [Callouts](/reference/graphics/#callouts).
