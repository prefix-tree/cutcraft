// The block on its own, with its defaults: how a city got around, six years in five seconds.
import { Composition, Layer, Track } from "@uberscene/kit";

import { BarRace } from "./block";

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
        <Layer id="race" start={0} duration={6}>
          <BarRace />
        </Layer>
      </Track>
    </Composition>
  );
}
