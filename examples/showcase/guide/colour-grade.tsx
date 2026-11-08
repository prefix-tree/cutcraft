import { Adjustment, Clip, Composition, Effect, Track } from "@cutcraft/kit";

// The shot as it came from the camera, then, from 1.5 s, a grade over it: exposure, white balance, curves and
// vibrance, written in the order a colourist works. An <Adjustment> grades everything beneath it for its own time.
export default function Video() {
  return (
    <Composition fps={30} width={960} height={540}>
      <Track id="main">
        <Clip id="pour" src="asset:coffee" in={11} out={14} fit="cover" />
      </Track>
      <Track id="looks" layout="free">
        <Adjustment id="grade" start={1.5} duration={1.5}>
          <Effect id="expose" type="exposure" params={{ stops: 0.5 }} />
          <Effect id="balance" type="whiteBalance" params={{ temperature: 0.3 }} />
          <Effect
            id="tone"
            type="curves"
            params={{
              rgb: [
                [0, 0.03],
                [0.25, 0.2],
                [0.75, 0.84],
                [1, 1],
              ],
            }}
          />
          <Effect id="pop" type="vibrance" params={{ amount: 0.6 }} />
        </Adjustment>
      </Track>
    </Composition>
  );
}
