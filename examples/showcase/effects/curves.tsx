import { Clip, Composition, Effect, Keyframe, Track } from "@cutcraft/kit";

// curves: Reshapes the tones through curves, for all channels or each one.
export default function Video() {
  return (
    <Composition fps={30} width={640} height={360}>
      <Track id="main">
        <Clip id="shot" src="asset:coffee" in={12} out={15} fit="cover">
          <Effect id="look" type="curves">
            <Keyframe
              id="k1"
              param="rgb"
              at={0.5}
              value={[
                [0, 0],
                [1, 1],
              ]}
            />
            <Keyframe
              id="k2"
              param="rgb"
              at={1.5}
              value={[
                [0, 0],
                [0.25, 0.15],
                [0.75, 0.88],
                [1, 1],
              ]}
              easing="ease-in-out"
            />
          </Effect>
        </Clip>
      </Track>
    </Composition>
  );
}
