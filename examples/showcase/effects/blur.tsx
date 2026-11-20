import { Clip, Composition, Effect, Keyframe, Track } from "@uberscene/kit";

// blur: Softens the picture; the radius is the Gaussian's standard deviation, in pixels.
export default function Video() {
  return (
    <Composition fps={30} width={640} height={360}>
      <Track id="main">
        <Clip id="shot" src="asset:espresso" in={2} out={5} fit="cover">
          <Effect id="look" type="blur">
            <Keyframe id="k1" param="radius" at={0.5} value={0} easing="ease-in-out" />
            <Keyframe id="k2" param="radius" at={1.5} value={8} />
          </Effect>
        </Clip>
      </Track>
    </Composition>
  );
}
