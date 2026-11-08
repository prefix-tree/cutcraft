import { Clip, Composition, Effect, Keyframe, Track } from "@cutcraft/kit";

// regionBlur: Blurs a box of the frame, to hide a face, a person, a plate or a screen.
export default function Video() {
  return (
    <Composition fps={30} width={640} height={360}>
      <Track id="main">
        <Clip id="shot" src="asset:coffeeWide" in={4} out={7} fit="cover">
          <Effect id="look" type="regionBlur" params={{ box: [0.66, 0, 0.34, 1], roundness: 0.3, feather: 16 }}>
            <Keyframe id="k1" param="radius" at={0.5} value={0} />
            <Keyframe id="k2" param="radius" at={1.5} value={18} easing="ease-in-out" />
          </Effect>
        </Clip>
      </Track>
    </Composition>
  );
}
