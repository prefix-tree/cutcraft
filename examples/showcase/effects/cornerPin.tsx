import { Clip, Composition, Track } from "@uberscene/kit";

// cornerPin: Moves the picture's four corners, to place it in a screen or a frame.
export default function Video() {
  return (
    <Composition fps={30} width={640} height={360}>
      <Track id="main">
        <Clip id="backdrop" src="asset:coffeeWide" in={4} out={7} fit="cover" />
      </Track>
      <Track id="pinned">
        <Clip
          id="shot"
          src="asset:coffee"
          in={12}
          out={15}
          fit="cover"
          effects={[
            {
              type: "cornerPin",
              topLeft: [
                { at: 0.5, value: [0, 0], easing: "ease-in-out" },
                { at: 1.5, value: [0.2, 0.14] },
              ],
              topRight: [
                { at: 0.5, value: [1, 0], easing: "ease-in-out" },
                { at: 1.5, value: [0.84, 0.06] },
              ],
              bottomRight: [
                { at: 0.5, value: [1, 1], easing: "ease-in-out" },
                { at: 1.5, value: [0.88, 0.9] },
              ],
              bottomLeft: [
                { at: 0.5, value: [0, 1], easing: "ease-in-out" },
                { at: 1.5, value: [0.14, 0.82] },
              ],
            },
          ]}
        />
      </Track>
    </Composition>
  );
}
