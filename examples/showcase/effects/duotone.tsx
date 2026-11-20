import { Clip, Composition, Track } from "@uberscene/kit";

// duotone: Maps the picture's brightness onto two colours.
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
              type: "duotone",
              amount: [
                { at: 0.5, value: 0, easing: "ease-in-out" },
                { at: 1.5, value: 1 },
              ],
            },
          ]}
        />
      </Track>
    </Composition>
  );
}
