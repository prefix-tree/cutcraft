import { z } from "zod";

import { Audio, Captions, Clip, Composition, knob, Marker, Shape, Title, Track } from "@uberscene/kit";

export const schema = z.object({
  accent: knob.color().describe("Highlight ring colour"),
});

export const defaults = { accent: "#ffd400" };

/**
 * A product demo over a screen recording. The crop keyframes zoom into the
 * first click and back out; the markers name every click so the next edit
 * can find them. The voice-over has a transcript, so its captions are
 * generated.
 */
export default function Video({ accent }: z.infer<typeof schema>) {
  return (
    <Composition fps={30} width={1920} height={1080} background={{ mode: "color", color: "#101418" }}>
      <Marker id="click-menu" at={3} label="menu" />
      <Marker id="click-roast" at={9} label="roast" />
      <Marker id="click-order" at={15} label="order" />

      <Track id="screen" name="Screen">
        {/* The recording has no transcript, so a numeric trim. The crop keyframes are element-relative seconds. */}
        <Clip
          id="rec"
          src="asset:screen"
          in={0}
          duration={20}
          fit="cover"
          transform={{
            crop: {
              x: [
                { at: 2.6, value: 0, easing: "easeInOutCubic" },
                { at: 3, value: 0.55 },
                { at: 5.5, value: 0.55, easing: "easeInOutCubic" },
                { at: 6, value: 0 },
              ],
              y: [
                { at: 2.6, value: 0, easing: "easeInOutCubic" },
                { at: 3, value: 0.1 },
                { at: 5.5, value: 0.1, easing: "easeInOutCubic" },
                { at: 6, value: 0 },
              ],
              width: [
                { at: 2.6, value: 1, easing: "easeInOutCubic" },
                { at: 3, value: 0.4 },
                { at: 5.5, value: 0.4, easing: "easeInOutCubic" },
                { at: 6, value: 1 },
              ],
              height: [
                { at: 2.6, value: 1, easing: "easeInOutCubic" },
                { at: 3, value: 0.4 },
                { at: 5.5, value: 0.4, easing: "easeInOutCubic" },
                { at: 6, value: 1 },
              ],
            },
          }}
        />
      </Track>

      <Track id="callouts" name="Callouts">
        {/* A ring on the button for each click; anchored to the recording so a retrim moves them with it. */}
        <Shape
          id="ring-menu"
          anchor="rec"
          offset={3}
          duration={1.5}
          shape="circle"
          width={140}
          height={140}
          fill={{ type: "none" }}
          stroke={{ color: accent, width: 8 }}
          box={{ x: 1480, y: 260, origin: "center" }}
        />
        <Shape
          id="ring-roast"
          anchor="rec"
          offset={9}
          duration={1.5}
          shape="circle"
          width={140}
          height={140}
          fill={{ type: "none" }}
          stroke={{ color: accent, width: 8 }}
          box={{ x: 660, y: 580, origin: "center" }}
        />
        <Shape
          id="ring-order"
          anchor="rec"
          offset={15}
          duration={1.5}
          shape="circle"
          width={140}
          height={140}
          fill={{ type: "none" }}
          stroke={{ color: accent, width: 8 }}
          box={{ x: 1600, y: 920, origin: "center" }}
        />
        <Title
          id="step-1"
          anchor="rec"
          offset={0.4}
          duration={2.4}
          size={56}
          weight={700}
          valign="top"
          box={{ x: 960, y: 620, origin: "center" }}
          animation={{ preset: "fade", in: 0.3, out: 0.3 }}
        >
          1. Open the dashboard
        </Title>
      </Track>

      <Track id="voice" layout="free" role="dialogue">
        <Audio id="vo" src="asset:voice" start={0.5} in="word:0" out="word:13.end" />
      </Track>

      <Track id="music" layout="free" role="music">
        <Audio
          id="bed"
          src="asset:music"
          start={0}
          duration="fill"
          volume={0.25}
          fade={{ in: 0.5, out: 1 }}
          duck={{ under: "voice", to: 0.1 }}
        />
      </Track>

      <Captions id="captions" src="asset:voice" style={{ size: 40 }} />
    </Composition>
  );
}
