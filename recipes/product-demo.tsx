import { z } from "zod";

import { Audio, Captions, Clip, Composition, Keyframe, Marker, Shape, Title, Track } from "@cutcraft/kit";

export const schema = z.object({
  accent: z.string().describe("Highlight ring colour"),
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
      <Marker id="click-new" at={3} label="new project" />
      <Marker id="click-template" at={9} label="template" />
      <Marker id="click-deploy" at={15} label="deploy" />

      <Track id="screen" name="Screen">
        {/* The recording has no transcript, so a numeric trim. The crop keyframes are element-relative seconds. */}
        <Clip id="rec" src="asset:screen" in={0} duration={20} fit="cover">
          <Keyframe id="z1-x0" property="transform.crop.x" at={2.6} value={0} easing="easeInOutCubic" />
          <Keyframe id="z1-x1" property="transform.crop.x" at={3} value={0.55} />
          <Keyframe id="z1-x2" property="transform.crop.x" at={5.5} value={0.55} easing="easeInOutCubic" />
          <Keyframe id="z1-x3" property="transform.crop.x" at={6} value={0} />
          <Keyframe id="z1-y0" property="transform.crop.y" at={2.6} value={0} easing="easeInOutCubic" />
          <Keyframe id="z1-y1" property="transform.crop.y" at={3} value={0.1} />
          <Keyframe id="z1-y2" property="transform.crop.y" at={5.5} value={0.1} easing="easeInOutCubic" />
          <Keyframe id="z1-y3" property="transform.crop.y" at={6} value={0} />
          <Keyframe id="z1-w0" property="transform.crop.width" at={2.6} value={1} easing="easeInOutCubic" />
          <Keyframe id="z1-w1" property="transform.crop.width" at={3} value={0.4} />
          <Keyframe id="z1-w2" property="transform.crop.width" at={5.5} value={0.4} easing="easeInOutCubic" />
          <Keyframe id="z1-w3" property="transform.crop.width" at={6} value={1} />
          <Keyframe id="z1-h0" property="transform.crop.height" at={2.6} value={1} easing="easeInOutCubic" />
          <Keyframe id="z1-h1" property="transform.crop.height" at={3} value={0.4} />
          <Keyframe id="z1-h2" property="transform.crop.height" at={5.5} value={0.4} easing="easeInOutCubic" />
          <Keyframe id="z1-h3" property="transform.crop.height" at={6} value={1} />
        </Clip>
      </Track>

      <Track id="callouts" name="Callouts">
        {/* A ring on the button for each click; anchored to the recording so a retrim moves them with it. */}
        <Shape
          id="ring-new"
          anchor="rec"
          offset={3}
          duration={1.5}
          shape="circle"
          width={140}
          height={140}
          fill={{ type: "none" }}
          stroke={{ color: accent, width: 8 }}
          transform={{ position: { x: 520, y: -280 } }}
        />
        <Shape
          id="ring-template"
          anchor="rec"
          offset={9}
          duration={1.5}
          shape="circle"
          width={140}
          height={140}
          fill={{ type: "none" }}
          stroke={{ color: accent, width: 8 }}
          transform={{ position: { x: -300, y: 40 } }}
        />
        <Shape
          id="ring-deploy"
          anchor="rec"
          offset={15}
          duration={1.5}
          shape="circle"
          width={140}
          height={140}
          fill={{ type: "none" }}
          stroke={{ color: accent, width: 8 }}
          transform={{ position: { x: 640, y: 380 } }}
        />
        <Title
          id="step-1"
          anchor="rec"
          offset={0.4}
          duration={2.4}
          size={56}
          weight={700}
          valign="top"
          transform={{ position: { x: 0, y: 80 } }}
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

      <Captions id="captions" src="asset:voice" style={{ position: "bottom", size: 40 }} />
    </Composition>
  );
}
