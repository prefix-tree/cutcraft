// The block on its own, with its defaults, in a theme of its own: what its preview shows.
import { Composition, Layer, Track } from "@uberscene/kit";

import { HundredCells } from "./block";

export default function Demo() {
  return (
    <Composition
      fps={30}
      width={1080}
      height={1920}
      background={{ mode: "color", color: "$background" }}
      theme={{ extends: "midnight", palette: { background: "#0b1530", surface: "#33416b", accent: "#ffd23f" } }}
    >
      <Track id="graphics" layout="free">
        <Layer id="hundred" start={0} duration={5}>
          <HundredCells />
        </Layer>
      </Track>
    </Composition>
  );
}
