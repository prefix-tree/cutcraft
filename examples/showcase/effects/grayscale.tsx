import { Clip, Composition, Track } from "@uberscene/kit";

// grayscale: Takes the colour out.
export default function Video() {
  return (
    <Composition fps={30} width={640} height={360}>
      <Track id="main">
        <Clip
          id="shot"
          src="asset:coffee"
          in={12}
          out={15}
          fit="cover"
          effects={[
            {
              type: "grayscale",
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
