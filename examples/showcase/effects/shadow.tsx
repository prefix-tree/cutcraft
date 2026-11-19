import { Clip, Composition, Effect, Keyframe, Title, Track } from "@uberscene/kit";

// shadow: Casts a soft drop shadow behind the element's own shape.
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
        <Title id="word" start={0} duration={3} size={128} color="#e8a33d">
          <Effect id="look" type="shadow" params={{ x: 8, y: 8, radius: 3 }}>
            <Keyframe id="k1" param="opacity" at={0.5} value={0} />
            <Keyframe id="k2" param="opacity" at={1.5} value={0.9} easing="ease-in-out" />
          </Effect>
          Crema
        </Title>
      </Track>
    </Composition>
  );
}
