import { Clip, Composition, Effect, Keyframe, Track } from "@cutcraft/kit";

// vignette: Darkens the edges of a clip, a nested sequence, or everything beneath an adjustment.
export default function Video() {
  return (
    <Composition fps={30} width={640} height={360}>
      <Track id="main">
        <Clip id="shot" src="asset:coffee" in={12} out={15} fit="cover">
          <Effect id="look" type="vignette">
            <Keyframe id="k1" param="amount" at={0.5} value={0} />
            <Keyframe id="k2" param="amount" at={1.5} value={0.9} easing="ease-in-out" />
          </Effect>
        </Clip>
      </Track>
    </Composition>
  );
}
