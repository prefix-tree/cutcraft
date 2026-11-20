import { Clip, Composition, Track } from "@uberscene/kit";

// halftone: Prints the picture as a screen of dots, in one ink or four.
export default function Video() {
  return (
    <Composition fps={30} width={640} height={360}>
      <Track id="main">
        <Clip
          id="shot"
          src="asset:espresso"
          in={2}
          out={5}
          fit="cover"
          effects={[
            {
              type: "halftone",
              size: 7,
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
