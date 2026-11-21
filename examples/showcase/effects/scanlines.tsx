import { Clip, Composition, Track } from "@uberscene/kit";

// scanlines: Lays the dark lines of an old screen over the picture.
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
              type: "scanlines",
              spacing: 4,
              speed: 8,
              intensity: [
                { at: 0.5, value: 0, easing: "easeInOut" },
                { at: 1.5, value: 0.5 },
              ],
            },
          ]}
        />
      </Track>
    </Composition>
  );
}
