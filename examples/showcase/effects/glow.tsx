import { Clip, Composition, Effect, Keyframe, Title, Track } from "@uberscene/kit";

// glow: Lights a halo around the bright parts.
export default function Video() {
  return (
    <Composition fps={30} width={640} height={360}>
      <Track id="main">
        <Clip id="backdrop" src="asset:espresso" in={10} out={13} fit="cover">
          <Effect id="soft" type="blur" params={{ radius: 10 }} />
          <Effect id="dim" type="brightness" params={{ amount: -0.35 }} />
        </Clip>
      </Track>
      <Track id="text" layout="free">
        <Title id="word" start={0} duration={3} style={{ size: 128, color: "#e8a33d" }}>
          <Effect id="look" type="glow">
            <Keyframe id="k1" param="intensity" at={0.5} value={0} easing="ease-in-out" />
            <Keyframe id="k2" param="intensity" at={1.5} value={2} />
          </Effect>
          Crema
        </Title>
      </Track>
    </Composition>
  );
}
