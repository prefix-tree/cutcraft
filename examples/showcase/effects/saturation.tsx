import { Clip, Composition, Effect, Keyframe, Track } from "@uberscene/kit";

// saturation: Makes colours richer or greyer.
export default function Video() {
  return (
    <Composition fps={30} width={640} height={360}>
      <Track id="main">
        <Clip id="shot" src="asset:coffee" in={12} out={15} fit="cover">
          <Effect id="look" type="saturation">
            <Keyframe id="k1" param="amount" at={0.5} value={0} easing="ease-in-out" />
            <Keyframe id="k2" param="amount" at={1.5} value={0.8} />
          </Effect>
        </Clip>
      </Track>
    </Composition>
  );
}
