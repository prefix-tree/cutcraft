import { Clip, Composition, Track } from "@uberscene/kit";

// hue: Turns every colour around the colour wheel.
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
              type: "hue",
              angle: [
                { at: 0.5, value: 0, easing: "easeInOut" },
                { at: 1.5, value: 180 },
              ],
            },
          ]}
        />
      </Track>
    </Composition>
  );
}
