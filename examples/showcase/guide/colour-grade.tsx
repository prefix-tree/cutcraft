import { Adjustment, Clip, Composition, Track } from "@uberscene/kit";

// The shot as it came from the camera, then, from 1.5 s, a grade over it: exposure, white balance, curves and
// vibrance, written in the order a colourist works. An <Adjustment> grades everything beneath it for its own time.
export default function Video() {
  return (
    <Composition fps={30} width={960} height={540}>
      <Track id="main">
        <Clip id="pour" src="asset:redCup" in={18} out={21} fit="cover" />
      </Track>
      <Track id="looks" layout="free">
        <Adjustment
          id="grade"
          start={1.5}
          duration={1.5}
          effects={[
            { type: "exposure", stops: 0.5 },
            { type: "whiteBalance", temperature: 0.3 },
            {
              type: "curves",
              rgb: [
                [0, 0.03],
                [0.25, 0.2],
                [0.75, 0.84],
                [1, 1],
              ],
            },
            { type: "vibrance", amount: 0.6 },
          ]}
        />
      </Track>
    </Composition>
  );
}
