import { Clip, Composition, Track } from "@uberscene/kit";

// fractalNoise: Blends a moving cloud of noise over the picture: mist, smoke or texture.
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
              type: "fractalNoise",
              blend: "screen",
              size: 140,
              contrast: 1.6,
              evolution: 0.5,
              opacity: [
                { at: 0.5, value: 0, easing: "easeInOut" },
                { at: 1.5, value: 0.6 },
              ],
            },
          ]}
        />
      </Track>
    </Composition>
  );
}
