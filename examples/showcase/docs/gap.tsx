import { Clip, Composition, Gap, Track } from "@cutcraft/kit";

export default function Video() {
  return (
    <Composition fps={30} width={960} height={540} background={{ mode: "color", color: "#101421" }}>
      <Track id="main">
        <Clip id="a" src="asset:aurora" in={0} out={1.5} fit="cover" />
        <Gap id="pause" duration={1} />
        <Clip id="b" src="asset:spiral" in={0} out={1.5} fit="cover" />
      </Track>
    </Composition>
  );
}
