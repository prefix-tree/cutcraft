import { Clip, Composition, Effect, Keyframe, Track } from "@cutcraft/kit";

// levels: Sets the black point, the white point and the gamma between them.
export default function Video() {
  return (
    <Composition fps={30} width={640} height={360}>
      <Track id="main">
        <Clip id="shot" src="asset:coffee" in={12} out={15} fit="cover">
          <Effect id="look" type="levels">
            <Keyframe id="k1" param="black" at={0.5} value={0} />
            <Keyframe id="k2" param="black" at={1.5} value={0.15} easing="ease-in-out" />
          </Effect>
        </Clip>
      </Track>
    </Composition>
  );
}
