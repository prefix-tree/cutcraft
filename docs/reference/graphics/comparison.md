# Comparison

Bars side by side for a few values, each with its label and value, growing over `growFor` seconds. `max` sets the scale (default: the largest value). Animated: it changes over its whole duration.

<Example src="previews/graphics/comparison" alt="Comparison">

```tsx
<Composition fps={30} width={1280} height={720}>
  <Track id="main" layout="free">
    <Graphic
      id="g1"
      kind="comparison"
      items={[{"label":"Manual edit","value":6,"color":"$muted"},{"label":"With CutCraft","value":1.5}]}
      suffix=" h"
      decimals={1}
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
| `items` | { label, value, color }[] | `[{"label":"Before","value":40},{"label":"After","value":75}]` |
| `orientation` | "horizontal" \| "vertical" | `"horizontal"` |
| `max` | number |  |
| `showValues` | boolean | `true` |
| `decimals` | integer | `0` |
| `prefix` | string | `""` |
| `suffix` | string | `""` |
| `growFor` | number (0..60) | `1` |
| `color` | string | `"$primary"` |
| `track` | string | `"$surface"` |
| `labelColor` | string | `"$text"` |
| `font` | string | `"$body"` |

Plus the [`<Graphic>` props](/reference/elements/graphic) every kind takes. More in [Data](/reference/graphics/#data).
