// The block on its own, with its defaults: five points named a little over a second apart.
import { Composition, Layer, Track } from "@uberscene/kit";

import { PointList } from "./block";

export default function Demo() {
  return (
    <Composition
      fps={30}
      width={1080}
      height={1920}
      background={{ mode: "color", color: "$background" }}
      theme={{ extends: "midnight", palette: { background: "#0b1530", surface: "#16234a", accent: "#ffd23f" } }}
    >
      <Track id="graphics" layout="free">
        <Layer id="points" start={0} duration={7}>
          <PointList />
        </Layer>
      </Track>
    </Composition>
  );
}
