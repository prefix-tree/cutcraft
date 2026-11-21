import { Clip, Composition, Track } from "@uberscene/kit";

// vignette: Darkens the edges of a clip, a nested sequence, or everything beneath an adjustment.
export default function Video() {
  return (
    <Composition fps={30} width={640} height={360}>
      <Track id="main">
        <Clip
          id="shot"
          src="asset:coffeeWide"
          in={4}
          out={7}
          fit="cover"
          effects={[
            {
              type: "vignette",
              amount: [
                { at: 0.5, value: 0, easing: "easeInOut" },
                { at: 1.5, value: 0.9 },
              ],
            },
          ]}
        />
      </Track>
    </Composition>
  );
}
