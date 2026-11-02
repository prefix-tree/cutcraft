# Callout

Text in a rounded box with a pointer on one side; `tailAt` slides the pointer along that side (0 to 1).

<Example src="previews/graphics/callout" alt="Callout">

```tsx
<Composition fps={30} width={640} height={360}>
  <Track id="main" layout="free">
    <Graphic
      id="g1"
      kind="callout"
      text="New in 2.0"
      tail="bottom"
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
| `text` | string | `"Look here"` |
| `color` | string | `"$text"` |
| `font` | string | `"$body"` |
| `size` | number (0..400) | `36` |
| `weight` | integer | `700` |
| `fill` | string | `"$surface"` |
| `border` | string | `"none"` |
| `borderWidth` | number (0..50) | `0` |
| `radius` | number (0..∞) \| string | `"$radius"` |
| `tail` | "bottom" \| "top" \| "left" \| "right" \| "none" | `"bottom"` |
| `tailAt` | number (0..1) | `0.5` |

Plus the [`<Graphic>` props](/reference/elements/graphic) every kind takes. More in [Callouts](/reference/graphics/#callouts).
