import { Clip, Composition, Effect, Keyframe, Track } from "@cutcraft/kit";

// pixelate: Turns the picture, or a box of it, into a coarse mosaic.
export default function Video() {
  return (
    <Composition fps={30} width={640} height={360}>
      <Track id="main">
        <Clip id="shot" src="asset:coffeeWide" in={4} out={7} fit="cover">
          <Effect id="look" type="pixelate" params={{ box: [0.66, 0, 0.34, 1] }}>
            <Keyframe id="k1" param="size" at={0.5} value={1} />
            <Keyframe id="k2" param="size" at={1.5} value={18} easing="ease-in-out" />
          </Effect>
        </Clip>
      </Track>
    </Composition>
  );
}
