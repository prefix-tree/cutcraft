import { Clip, Composition, Effect, Keyframe, Track } from "@uberscene/kit";

// sepia: Tones the picture brown, like an old print.
export default function Video() {
  return (
    <Composition fps={30} width={640} height={360}>
      <Track id="main">
        <Clip id="shot" src="asset:redCup" in={18} out={21} fit="cover">
          <Effect id="look" type="sepia">
            <Keyframe id="k1" param="amount" at={0.5} value={0} easing="easeInOut" />
            <Keyframe id="k2" param="amount" at={1.5} value={1} />
          </Effect>
        </Clip>
      </Track>
    </Composition>
  );
}
