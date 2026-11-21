// The block on its own, with its defaults: a ten word line built at a speaking pace, two words stressed.
import { Composition, Layer, Track } from "@uberscene/kit";

import { QuoteBuild } from "./block";

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
        <Layer id="quote" start={0} duration={5.5}>
          <QuoteBuild />
        </Layer>
      </Track>
    </Composition>
  );
}
