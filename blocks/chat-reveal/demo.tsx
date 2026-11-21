// The block on its own, with its defaults: one question, and a reply that thinks, then types.
import { Composition, Layer, Track } from "@uberscene/kit";

import { ChatReveal } from "./block";

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
        <Layer id="chat" start={0} duration={6}>
          <ChatReveal />
        </Layer>
      </Track>
    </Composition>
  );
}
