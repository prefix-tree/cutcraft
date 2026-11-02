# Lower third card

A name and a role on a rounded card, with an accent dot before the name.

<Example src="previews/graphics/lower-third-card" alt="Lower third card">

```tsx
<Composition fps={30} width={640} height={360}>
  <Track id="main" layout="free">
    <Graphic
      id="g1"
      kind="lower-third-card"
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
| `name` | string | `"Jane Doe"` |
| `role` | string | `"Founder, Shed"` |
| `accent` | string | `"$primary"` |
| `fill` | string | `"$surface"` |
| `color` | string | `"$text"` |
| `muted` | string | `"$muted"` |
| `font` | string | `"$heading"` |
| `roleFont` | string | `"$body"` |
| `size` | number (0..400) | `44` |
| `weight` | integer | `700` |
| `radius` | number (0..∞) \| string | `"$radius"` |

Plus the [`<Graphic>` props](/reference/elements/graphic) every kind takes. More in [Lower thirds](/reference/graphics/#lower-thirds).
