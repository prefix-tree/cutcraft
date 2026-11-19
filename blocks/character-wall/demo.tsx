// The block on its own, with a font that has its characters, changing all at once three times and then fading back.
import { Composition, fontFamily, googleFont, Layer, Track } from "@uberscene/kit";

import { CharacterWall } from "./block";

export const noto = googleFont("Noto Sans SC", { weights: [400] });

export default function Demo() {
  return (
    <Composition
      fps={30}
      width={1080}
      height={1920}
      background={{ mode: "color", color: "$background" }}
      theme={{ extends: "mono", palette: { background: "#000000", muted: "#4a4a4a" } }}
    >
      <Track id="wall" layout="free">
        <Layer id="letters" start={0} duration={7} ground>
          <CharacterWall
            font={fontFamily(noto, "sans-serif")}
            changeAt={[1.5, 3, 4.5]}
            dim={{ after: 5.5, over: 0.6, to: 0.45 }}
          />
        </Layer>
      </Track>
    </Composition>
  );
}
