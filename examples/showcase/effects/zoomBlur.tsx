import { Clip, Composition, Track } from "@uberscene/kit";

// zoomBlur: Streaks the picture out from a centre.
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
              type: "zoomBlur",
              length: [
                { at: 0.5, value: 0, easing: "ease-in-out" },
                { at: 1.5, value: 60 },
              ],
            },
          ]}
        />
      </Track>
    </Composition>
  );
}
