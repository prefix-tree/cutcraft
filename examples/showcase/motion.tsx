import { Composition, Graphic, interpolate, Layer, spring, Track, useLayer } from "@cutcraft/kit";

const BARS = [
  { label: "Mon", value: 0.42 },
  { label: "Tue", value: 0.68 },
  { label: "Wed", value: 0.55 },
  { label: "Thu", value: 0.9 },
  { label: "Fri", value: 0.74 },
];

/** Bars that spring up one after another; the timing comes from the layer's clock, so a seek shows the right frame. */
function Bars({ color }: { color: string }) {
  const { elapsed, remaining } = useLayer();
  const fade = interpolate(remaining, [0, 0.4], [0, 1], { extrapolateRight: "clamp" });
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        width: "100%",
        height: "100%",
        opacity: fade,
      }}
    >
      <div style={{ display: "flex", alignItems: "flex-end", gap: 18, height: 320 }}>
        {BARS.map((bar, i) => (
          <div
            key={bar.label}
            style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10, width: 80 }}
          >
            <div
              style={{
                width: 80,
                height: 260 * bar.value * spring({ time: elapsed - i * 0.12, damping: 12 }),
                background: color,
                borderRadius: 10,
              }}
            />
            <div style={{ color: "#f3ead6", fontSize: 22, fontWeight: 600 }}>{bar.label}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

/** Motion from a few lines of code: a spring-driven chart in a Layer, a callout that points at the peak, confetti. */
export default function Video() {
  return (
    <Composition fps={30} width={960} height={540} theme={{ extends: "midnight", palette: { primary: "#c8402a" } }}>
      <Track id="bg" layout="free">
        <Graphic id="sky" kind="gradient-background" from="#101421" to="#23395b" start={0} duration={5} />
      </Track>
      <Track id="chart" layout="free">
        <Layer id="bars" start={0} duration={5}>
          <Bars color="#c8402a" />
        </Layer>
        <Graphic
          id="peak"
          kind="callout"
          text="Best day"
          tail="bottom"
          start={1.4}
          duration={3.6}
          transform={{ position: { x: 98, y: -150 } }}
        />
        <Graphic id="party" kind="confetti" start={1.6} duration={3.4} />
      </Track>
    </Composition>
  );
}
