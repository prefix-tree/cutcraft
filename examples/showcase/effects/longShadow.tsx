import { Clip, Composition, Effect, Keyframe, Title, Track } from "@cutcraft/kit";

// longShadow: Extrudes a long, hard shadow from the element's shape.
export default function Video() {
  return (
    <Composition fps={30} width={640} height={360}>
      <Track id="main">
        <Clip id="backdrop" src="asset:aurora" in={0} out={3} fit="cover" />
      </Track>
      <Track id="text" layout="free">
        <Title id="word" start={0} duration={3} size={140} color="#e8a33d">
          <Effect id="look" type="longShadow">
            <Keyframe id="k1" param="opacity" at={0.5} value={0} />
            <Keyframe id="k2" param="opacity" at={1.5} value={1} easing="ease-in-out" />
          </Effect>
          Shed
        </Title>
      </Track>
    </Composition>
  );
}
