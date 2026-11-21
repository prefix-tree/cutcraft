import { Clip, Composition, Track } from "@uberscene/kit";

// blur: Softens the picture; the radius is the Gaussian's standard deviation, in pixels.
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
              type: "blur",
              radius: [
                { at: 0.5, value: 0, easing: "easeInOut" },
                { at: 1.5, value: 8 },
              ],
            },
          ]}
        />
      </Track>
    </Composition>
  );
}
