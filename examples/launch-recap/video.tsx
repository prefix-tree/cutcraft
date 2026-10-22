import { z } from "zod";
import { Audio, Caption, Captions, Clip, Composition, Keyframe, Layer, Marker, Shape, Title, Track, Transition, useT } from "@cutcut/kit";

export const schema = z.object({
  product: z.string().describe("Product name on the title card"),
  tagline: z.string().describe("One line under the title"),
  accent: z.string().describe("Accent colour for the lower third and the call to action"),
  cta: z.string().describe("Call to action on the closing card"),
});

export const defaults = { product: "Shed", tagline: "A cloud for small software", accent: "#ff5a1f", cta: "getshard.sh" };

export default function Video({ product, tagline, accent, cta }: z.infer<typeof schema>) {
  return (
    <Composition fps={30} width={1920} height={1080} background={{ mode: "color", color: "#0b0d12" }}>
      <Marker id="m-hook" at={0} label="hook" />
      <Marker id="m-close" at={17.4} label="close" />

      <Track id="main" name="Story">
        {/* The sentence the whole recap hangs on; trimmed by words so a re-transcription keeps it. */}
        <Clip id="hook" src="asset:founder" in="word:12" out="word:23.end" />
        <Transition id="x1" type="crossfade" duration={0.4} />
        {/* Product b-roll, second shot, with a slow push-in. */}
        <Clip id="broll" src="asset:product" in="shot:1" out="shot:1.end" fit="cover">
          <Keyframe id="broll-sx0" property="transform.scale.x" at={0} value={1} easing="easeInOutSine" />
          <Keyframe id="broll-sx1" property="transform.scale.x" at={6} value={1.08} />
          <Keyframe id="broll-sy0" property="transform.scale.y" at={0} value={1} easing="easeInOutSine" />
          <Keyframe id="broll-sy1" property="transform.scale.y" at={6} value={1.08} />
        </Clip>
        {/* The screen recording has no transcript, so a numeric trim. */}
        <Clip id="demo" src="asset:screen" in={2} duration={7} />
        <Transition id="x2" type="crossfade" duration={0.4} />
        {/* Back to the founder for the close. */}
        <Clip id="close" src="asset:founder" in="word:40" out="word:52.end" />
        {/* The logo holds while the call to action plays. */}
        <Clip id="outro" src="asset:logo" duration={3} fit="contain" transform={{ scale: 0.35 }} />
      </Track>

      <Track id="overlays" name="Overlays">
        <Title id="title" anchor="start" offset={0.4} duration={2.8} size={120} weight={700} valign="top" transform={{ position: { x: 0, y: 140 } }} animation={{ preset: "slide-up", in: 0.4, out: 0.3 }}>
          {product}
        </Title>
        <Title id="tagline" anchor="title" offset={0.5} duration={2.3} size={44} weight={400} color="#c8ccd6" valign="top" transform={{ position: { x: 0, y: 300 } }} animation={{ preset: "fade", in: 0.4, out: 0.3 }}>
          {tagline}
        </Title>
        <LowerThird who="Bohdan Snisar" what="Founder, Shed" accent={accent} />
        <Layer id="cta" anchor="outro" offset={0.3} duration={2.5}>
          <CallToAction text={cta} accent={accent} />
        </Layer>
      </Track>

      <Track id="music" layout="free" role="music">
        {/* The bed fills the whole recap and drops under the founder's voice. */}
        <Audio id="bed" src="asset:music" start={0} duration="fill" volume={0.35} fade={{ in: 0.5, out: 1.5 }} duck={{ under: "main", to: 0.15 }} />
      </Track>

      {/* Composition seconds: hook starts at 0 with word 12 (5.6 s in the source); close starts at 17.4 with word 40 (24.0 s). */}
      <Captions id="captions" style={{ position: "bottom", size: 44 }}>
        <Caption id="cap-1" start={0} end={3} text="Small software still deserves a real cloud." />
        <Caption id="cap-2" start={3.5} end={5.2} text="It should take one file." />
        <Caption id="cap-3" start={17.4} end={20.6} text="You write the file, your agent writes the file," />
        <Caption id="cap-4" start={21.2} end={22.6} text="and it just runs." />
      </Captions>
    </Composition>
  );
}

/** Used once, so its three elements are ordinary editable literals; timing stays literal inside. */
function LowerThird({ who, what, accent }: { who: string; what: string; accent: string }) {
  return (
    <>
      <Shape id="lt-bg" anchor="close" offset={0.4} duration={4} shape="rectangle" width={640} height={132} fill="#0b0d12" stroke={{ color: accent, width: 6 }} cornerRadius={10} transform={{ position: { x: -560, y: 290 } }} />
      <Title id="lt-name" anchor="close" offset={0.5} duration={3.9} size={40} weight={700} align="left" valign="top" transform={{ position: { x: 120, y: 778 } }} animation={{ preset: "slide-left", in: 0.3, out: 0.2 }}>
        {who}
      </Title>
      <Title id="lt-role" anchor="close" offset={0.6} duration={3.8} size={28} weight={400} color={accent} align="left" valign="top" transform={{ position: { x: 120, y: 836 } }} animation={{ preset: "fade", in: 0.3, out: 0.2 }}>
        {what}
      </Title>
    </>
  );
}

/** Layer interior: real React, driven by useT() from 0 to 1 over the layer. */
function CallToAction({ text, accent }: { text: string; accent: string }) {
  const t = useT();
  return (
    <div style={{ position: "absolute", left: 0, right: 0, bottom: 160, display: "flex", flexDirection: "column", alignItems: "center", gap: 18 }}>
      <div style={{ font: "700 56px Inter, system-ui, sans-serif", color: "#ffffff", letterSpacing: 1 }}>{text}</div>
      <div style={{ width: 520, height: 8, borderRadius: 4, background: "rgba(255,255,255,0.15)", overflow: "hidden" }}>
        <div style={{ width: `${Math.round(t * 100)}%`, height: "100%", background: accent }} />
      </div>
    </div>
  );
}
