import { Audio, Clip, Composition, Layer, Title, Track, Transition, useT, type AssetManifest } from "@cutcut/kit";

export const manifest: AssetManifest = {
  assets: {
    bars: { id: "bars", kind: "video", duration: 10, fps: 30, width: 640, height: 360, audio: { sampleRate: 48000, channels: 1, streams: 1 } },
    tone: { id: "tone", kind: "audio", duration: 20, audio: { sampleRate: 48000, channels: 1, streams: 1 } },
    logo: { id: "logo", kind: "image", duration: 0, width: 128, height: 128 },
    solid: { id: "solid", kind: "video", duration: 2, fps: 30, width: 640, height: 360 },
  },
};

export const defaults = {};

/**
 * main: v1 bars[0,4) → crossfade 0.5 → v2 bars[6,9) at 1.5× (2 s) → img 1 s → crossfade 0.5 → solid blue 1 s.
 * Timeline: v1 0–4, x1 3.5–4, v2 3.5–5.5, img 5.5–6.5, x2 6–6.5, solid 6–7. Duration 7 s.
 */
export default function Video() {
  return (
    <Composition fps={30} width={640} height={360} background={{ mode: "color", color: "#000000" }}>
      <Track id="main">
        <Clip id="v1" src="asset:bars" in={0} out={4} />
        <Transition id="x1" type="crossfade" duration={0.5} params={{ curve: "linear" }} />
        <Clip id="v2" src="asset:bars" in={6} out={9} speed={1.5} />
        <Clip id="img" src="asset:logo" duration={1} fit="cover" />
        <Transition id="x2" type="crossfade" duration={0.5} params={{ curve: "linear" }} />
        <Clip id="solid" src="asset:solid" in={0} out={1} />
      </Track>
      <Track id="overlays">
        <Title id="t1" anchor="v1" offset={0.5} duration={2} size={40} color="#00ff00">Hello</Title>
        <Layer id="l1" anchor="start" duration={3}>
          <Counter />
        </Layer>
      </Track>
      <Track id="music" layout="free" role="music">
        <Audio id="a1" src="asset:tone" start={0} duration="fill" volume={0.3} duck={{ under: "main", to: 0.1 }} />
      </Track>
    </Composition>
  );
}

function Counter() {
  const t = useT();
  return <div style={{ position: "absolute", right: 10, top: 10, color: "#fff", font: "20px monospace" }} data-counter="">{Math.round(1200 * t)}</div>;
}
