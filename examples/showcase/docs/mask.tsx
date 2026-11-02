import { Clip, Composition, Mask, Track } from "@cutcraft/kit";

export default function Video() {
  return (
    <Composition fps={30} width={960} height={540} background={{ mode: "color", color: "#f3ead6" }}>
      <Track id="main">
        <Clip id="shot" src="asset:spiral" in={0} out={3} fit="cover">
          <Mask id="oval" shape={{ ellipse: { cx: 0.5, cy: 0.5, rx: 0.3, ry: 0.4 } }} feather={20} />
        </Clip>
      </Track>
    </Composition>
  );
}
