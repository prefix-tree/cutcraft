# Progress bar

A bar that fills from `from` to `to` over the element's duration; give `value` to hold it still. Animated: it changes over its whole duration.

<Example src="previews/graphics/progress-bar" alt="Progress bar">

```tsx
<Composition fps={30} width={1280} height={720}>
  <Track id="main" layout="free">
    <Graphic
      id="g1"
      kind="progress-bar"
      value={0.62}
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
| `value` | number (0..1) |  |
| `from` | number (0..1) | `0` |
| `to` | number (0..1) | `1` |
| `fill` | string | `"$primary"` |
| `track` | string | `"$surface"` |
| `rounded` | boolean | `true` |

Plus the [`<Graphic>` props](/reference/elements/graphic) every kind takes. More in [Progress](/reference/graphics/#progress).
