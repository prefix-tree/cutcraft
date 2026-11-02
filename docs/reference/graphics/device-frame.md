# Device frame

A phone or a browser window drawn around an open screen; put footage under it on a lower track.

<Example src="previews/graphics/device-frame" alt="Device frame">

```tsx
<Composition fps={30} width={1280} height={720}>
  <Track id="main" layout="free">
    <Graphic
      id="g1"
      kind="device-frame"
      device="phone"
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
| `device` | "phone" \| "browser" | `"browser"` |
| `color` | string | `"$surface"` |
| `detail` | string | `"$muted"` |

Plus the [`<Graphic>` props](/reference/elements/graphic) every kind takes. More in [Frames](/reference/graphics/#frames).
