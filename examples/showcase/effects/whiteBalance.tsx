import { Clip, Composition, Effect, Keyframe, Track } from "@cutcraft/kit";

// whiteBalance: Warms or cools the picture, and tints it toward green or magenta.
export default function Video() {
  return (
    <Composition fps={30} width={640} height={360}>
      <Track id="main">
        <Clip id="shot" src="asset:coffee" in={12} out={15} fit="cover">
          <Effect id="look" type="whiteBalance">
            <Keyframe id="k1" param="temperature" at={0.5} value={0} />
            <Keyframe id="k2" param="temperature" at={1.5} value={0.6} easing="ease-in-out" />
          </Effect>
        </Clip>
      </Track>
    </Composition>
  );
}
