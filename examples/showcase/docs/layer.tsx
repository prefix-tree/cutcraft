import { Clip, Composition, Layer, Track, useLayer } from "@uberscene/kit";

export default function Video() {
  return (
    <Composition fps={30} width={960} height={540}>
      <Track id="main">
        <Clip id="shot" src="asset:coffeeWide" in={4} out={7} fit="cover" />
      </Track>
      <Track id="layers">
        <Layer id="clock" anchor="shot" duration={3}>
          <Elapsed />
        </Layer>
      </Track>
    </Composition>
  );
}

/** Any React inside a layer, drawn each frame; `useLayer().elapsed` is the seconds since it started (`useT()` is 0..1). */
function Elapsed() {
  const t = useLayer().elapsed;
  return (
    <div
      style={{
        position: "absolute",
        right: 200,
        bottom: 36,
        textAlign: "right",
        color: "#f4efe6",
        fontFamily: "'Space Grotesk', sans-serif",
      }}
    >
      <div style={{ color: "#e8a33d", fontSize: 22, fontWeight: 600, letterSpacing: "0.12em", marginBottom: 10 }}>
        BREW TIME
      </div>
      <div style={{ fontSize: 88, fontWeight: 700, lineHeight: 1, fontVariantNumeric: "tabular-nums" }}>
        {t.toFixed(1)} s
      </div>
    </div>
  );
}
