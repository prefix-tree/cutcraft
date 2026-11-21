import { Clip, Composition, Track } from "@uberscene/kit";

// chromaticAberration: Splits red and blue apart, as a cheap lens does.
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
              type: "chromaticAberration",
              distance: [
                { at: 0.5, value: 0, easing: "easeInOut" },
                { at: 1.5, value: 10 },
              ],
            },
          ]}
        />
      </Track>
    </Composition>
  );
}
