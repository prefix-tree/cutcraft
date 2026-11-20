import { Clip, Composition, Effect, Keyframe, Track } from "@uberscene/kit";

// chromaticAberration: Splits red and blue apart, as a cheap lens does.
export default function Video() {
  return (
    <Composition fps={30} width={640} height={360}>
      <Track id="main">
        <Clip id="shot" src="asset:espresso" in={2} out={5} fit="cover">
          <Effect id="look" type="chromaticAberration">
            <Keyframe id="k1" param="distance" at={0.5} value={0} easing="easeInOut" />
            <Keyframe id="k2" param="distance" at={1.5} value={10} />
          </Effect>
        </Clip>
      </Track>
    </Composition>
  );
}
