import { Clip, Composition, Track } from "@uberscene/kit";

// regionBlur: Blurs a box of the frame, to hide a face, a person, a plate or a screen.
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
              type: "regionBlur",
              box: [0.66, 0, 0.34, 1],
              roundness: 0.3,
              feather: 16,
              radius: [
                { at: 0.5, value: 0, easing: "easeInOut" },
                { at: 1.5, value: 18 },
              ],
            },
          ]}
        />
      </Track>
    </Composition>
  );
}
