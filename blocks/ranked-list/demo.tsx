// The block on its own, with its defaults: five apps ranked over three weeks, reordering twice.
import { Composition, Layer, Track } from "@uberscene/kit";

import { RankedList } from "./block";

export default function Demo() {
  return (
    <Composition
      fps={30}
      width={1080}
      height={1920}
      background={{ mode: "color", color: "$background" }}
      theme={{ extends: "midnight" }}
    >
      <Track id="graphics" layout="free">
        <Layer id="ranking" start={0} duration={5.5}>
          <RankedList />
        </Layer>
      </Track>
    </Composition>
  );
}
