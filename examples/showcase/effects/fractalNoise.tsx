import { Clip, Composition, Effect, Keyframe, Track } from "@cutcraft/kit";

// fractalNoise: Blends a moving cloud of noise over the picture: mist, smoke or texture.
export default function Video() {
  return (
    <Composition fps={30} width={640} height={360}>
      <Track id="main">
        <Clip id="shot" src="asset:coffee" in={12} out={15} fit="cover">
          <Effect id="look" type="fractalNoise" params={{ blend: "screen", size: 140, contrast: 1.6, evolution: 0.5 }}>
            <Keyframe id="k1" param="opacity" at={0.5} value={0} />
            <Keyframe id="k2" param="opacity" at={1.5} value={0.6} easing="ease-in-out" />
          </Effect>
        </Clip>
      </Track>
    </Composition>
  );
}
