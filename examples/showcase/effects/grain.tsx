import { Clip, Composition, Track } from "@uberscene/kit";

// grain: Adds moving film grain to a clip, a nested sequence, or everything beneath an adjustment.
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
              type: "grain",
              amount: [
                { at: 0.5, value: 0, easing: "ease-in-out" },
                { at: 1.5, value: 0.6 },
              ],
            },
          ]}
        />
      </Track>
    </Composition>
  );
}
