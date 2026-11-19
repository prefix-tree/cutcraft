import { Clip, Composition, Gap, Track } from "@uberscene/kit";

export default function Video() {
  return (
    <Composition fps={30} width={960} height={540} background={{ mode: "color", color: "#101421" }}>
      <Track id="main">
        <Clip id="a" src="asset:coffee" in={0} out={1.5} fit="cover" />
        <Gap id="pause" duration={1} />
        <Clip id="b" src="asset:espresso" in={26} out={27.5} fit="cover" />
      </Track>
    </Composition>
  );
}
