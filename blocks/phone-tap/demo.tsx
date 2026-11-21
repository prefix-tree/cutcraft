// The block on its own, with its defaults: a day's list, a tap on its third row, then one on the corner button.
import { Composition, Layer, Track } from "@uberscene/kit";

import { PhoneTap } from "./block";

export default function Demo() {
  return (
    <Composition
      fps={30}
      width={1080}
      height={1920}
      background={{ type: "color", color: "#070a14" }}
      theme={{ extends: "midnight" }}
    >
      <Track id="graphics" layout="free">
        <Layer id="phone" start={0} duration={5.5}>
          <PhoneTap />
        </Layer>
      </Track>
    </Composition>
  );
}
