import { Clip, Composition, Track } from "@uberscene/kit";

// saturation: Makes colours richer or greyer.
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
              type: "saturation",
              amount: [
                { at: 0.5, value: 0, easing: "easeInOut" },
                { at: 1.5, value: 0.8 },
              ],
            },
          ]}
        />
      </Track>
    </Composition>
  );
}
