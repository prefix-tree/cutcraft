import { Clip, Composition, Effect, Keyframe, Track } from "@cutcraft/kit";

// hue: Turns every colour around the colour wheel.
export default function Video() {
  return (
    <Composition fps={30} width={640} height={360}>
      <Track id="main">
        <Clip id="shot" src="asset:coffee" in={12} out={15} fit="cover">
          <Effect id="look" type="hue">
            <Keyframe id="k1" param="angle" at={0.5} value={0} />
            <Keyframe id="k2" param="angle" at={1.5} value={180} easing="ease-in-out" />
          </Effect>
        </Clip>
      </Track>
    </Composition>
  );
}
