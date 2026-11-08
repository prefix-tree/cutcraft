import { Clip, Composition, Effect, Keyframe, Track } from "@cutcraft/kit";

// scanlines: Lays the dark lines of an old screen over the picture.
export default function Video() {
  return (
    <Composition fps={30} width={640} height={360}>
      <Track id="main">
        <Clip id="shot" src="asset:coffee" in={12} out={15} fit="cover">
          <Effect id="look" type="scanlines" params={{ spacing: 4, speed: 8 }}>
            <Keyframe id="k1" param="intensity" at={0.5} value={0} />
            <Keyframe id="k2" param="intensity" at={1.5} value={0.5} easing="ease-in-out" />
          </Effect>
        </Clip>
      </Track>
    </Composition>
  );
}
