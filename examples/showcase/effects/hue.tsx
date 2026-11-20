import { Clip, Composition, Effect, Keyframe, Track } from "@uberscene/kit";

// hue: Turns every colour around the colour wheel.
export default function Video() {
  return (
    <Composition fps={30} width={640} height={360}>
      <Track id="main">
        <Clip id="shot" src="asset:redCup" in={18} out={21} fit="cover">
          <Effect id="look" type="hue">
            <Keyframe id="k1" param="angle" at={0.5} value={0} easing="easeInOut" />
            <Keyframe id="k2" param="angle" at={1.5} value={180} />
          </Effect>
        </Clip>
      </Track>
    </Composition>
  );
}
