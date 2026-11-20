import { Clip, Composition, Track } from "@uberscene/kit";

// lightLeak: Washes warm light in from the edges, as light leaking into a film camera.
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
              type: "lightLeak",
              evolution: 0.4,
              intensity: [
                { at: 0.5, value: 0, easing: "ease-in-out" },
                { at: 1.5, value: 0.7 },
              ],
            },
          ]}
        />
      </Track>
    </Composition>
  );
}
