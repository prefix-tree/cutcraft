import { Clip, Composition, Layer, Track, useT } from "@cutcraft/kit";

export default function Video() {
  return (
    <Composition fps={30} width={960} height={540}>
      <Track id="main">
        <Clip id="shot" src="asset:aurora" in={0} out={3} fit="cover" />
      </Track>
      <Track id="layers">
        <Layer id="clock" anchor="shot" duration={3}>
          <Elapsed />
        </Layer>
      </Track>
    </Composition>
  );
}

/** Any React inside a layer, drawn each frame; `useT()` is the layer's time in seconds. */
function Elapsed() {
  const t = useT();
  return (
    <div
      style={{
        display: "flex",
        width: "100%",
        height: "100%",
        alignItems: "center",
        justifyContent: "center",
        color: "#ffffff",
        fontSize: 120,
        fontWeight: 700,
      }}
    >
      {t.toFixed(1)} s
    </div>
  );
}
