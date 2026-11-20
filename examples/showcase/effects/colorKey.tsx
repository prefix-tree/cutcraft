import { Clip, Composition, Track } from "@uberscene/kit";

// colorKey: Makes one colour transparent: a green screen.
export default function Video() {
  return (
    <Composition fps={30} width={640} height={360}>
      <Track id="main">
        <Clip id="shot" src="asset:coffeeWide" in={4} out={7} fit="cover" />
      </Track>
      <Track id="keyed">
        <Clip
          id="greenscreen"
          src="asset:greenscreen"
          in={0}
          out={3}
          fit="cover"
          effects={[
            {
              type: "colorKey",
              color: "#00b140",
              tolerance: [
                { at: 0.5, value: 0, easing: "ease-in-out" },
                { at: 1.5, value: 0.3 },
              ],
            },
          ]}
        />
      </Track>
    </Composition>
  );
}
