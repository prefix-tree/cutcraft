import { Clip, Composition, Track } from "@uberscene/kit";

// curves: Reshapes the tones through curves, for all channels or each one.
export default function Video() {
  return (
    <Composition fps={30} width={640} height={360}>
      <Track id="main">
        <Clip
          id="shot"
          src="asset:redCup"
          in={18}
          out={21}
          fit="cover"
          effects={[
            {
              type: "curves",
              rgb: [
                {
                  at: 0.5,
                  value: [
                    [0, 0],
                    [1, 1],
                  ],
                  easing: "easeInOut",
                },
                {
                  at: 1.5,
                  value: [
                    [0, 0],
                    [0.25, 0.15],
                    [0.75, 0.88],
                    [1, 1],
                  ],
                },
              ],
            },
          ]}
        />
      </Track>
    </Composition>
  );
}
