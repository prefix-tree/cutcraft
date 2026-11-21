// The block on its own, with its defaults: two commands, one finding a block and one rendering a video.
import { Composition, Layer, Track } from "@uberscene/kit";

import { TerminalTyping } from "./block";

export default function Demo() {
  return (
    <Composition
      fps={30}
      width={1080}
      height={1920}
      background={{ type: "color", color: "$background" }}
      theme={{ extends: "midnight" }}
    >
      <Track id="graphics" layout="free">
        <Layer id="terminal" start={0} duration={6}>
          <TerminalTyping />
        </Layer>
      </Track>
    </Composition>
  );
}
