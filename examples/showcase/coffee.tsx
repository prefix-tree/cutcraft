import {
  Adjustment,
  Audio,
  Badge,
  Callout,
  Clip,
  Composition,
  Effect,
  Freeze,
  googleFont,
  Keyframe,
  Layer,
  LowerThird,
  SpeedKey,
  Title,
  Track,
  Transition,
} from "@uberscene/kit";

import { QuoteBuild } from "./blocks/quote-build";

/**
 * Two ways to a cup, cut from four stock shots: a slow pour-over, then a fast espresso. Between the shots, four
 * shader transitions of different kinds. On them, a push-in, a speed ramp into slow motion and a held frame on the
 * pour, a warm LUT that comes in while you watch, a grade under the closing line, titles built word by word, a lower
 * third, a callout and a badge, a quote built by a block, a film look over everything, and a sound cue on each beat.
 */
const display = googleFont("Barlow Condensed", { weights: [700] });
const mono = googleFont("Geist Mono", { weights: [500] });

const ACCENT = "#ff5a1f";
/** Under every title over footage, so the words hold on any frame. */
const LIFT = { color: "#000000b0", blur: 28, x: 0, y: 4 };

export default function Video() {
  return (
    <Composition
      fps={30}
      width={1920}
      height={1080}
      background={{ mode: "color", color: "#000000" }}
      theme={{
        extends: "midnight",
        palette: {
          background: "#000000",
          surface: "#0e0e0e",
          primary: ACCENT,
          accent: ACCENT,
          text: "#ffffff",
          muted: "#8a8a8a",
        },
        fonts: { heading: display, body: "Inter", mono },
        radius: 0,
      }}
    >
      <Track id="main" name="Story">
        {/* The wide pour-over, pushed in slowly while the title builds. */}
        <Clip id="open" src="asset:coffeeWide" in={2} out={8} fit="cover">
          <Keyframe id="open-sx-0" property="transform.scale.x" at={0} value={1} />
          <Keyframe id="open-sx-1" property="transform.scale.x" at={6} value={1.14} easing="easeInOutSine" />
          <Keyframe id="open-sy-0" property="transform.scale.y" at={0} value={1} />
          <Keyframe id="open-sy-1" property="transform.scale.y" at={6} value={1.14} easing="easeInOutSine" />
        </Clip>
        <Transition id="x1" type="filmBurn" duration={0.9} />
        {/* The close pour: it eases into slow motion, then one frame is held while the callout points at it. */}
        <Clip id="pour" src="asset:coffee" in={10} out={14} fit="cover">
          <SpeedKey id="pour-s0" at={0} speed={1} />
          <SpeedKey id="pour-s1" at={1.6} speed={0.4} easing="easeInOutQuad" />
          <Freeze id="pour-hold" at={12.4} start={4.2} duration={1.4} />
        </Clip>
        <Transition id="x2" type="iris" duration={0.9} />
        {/* The espresso machine: the warm LUT comes in halfway, so the shot is seen before and after. */}
        <Clip id="shot" src="asset:espresso" in={1} out={9} fit="cover">
          <Effect id="shot-warm" type="lut" params={{ src: "asset:warm" }}>
            <Keyframe id="shot-warm-0" param="amount" at={3.2} value={0} />
            <Keyframe id="shot-warm-1" param="amount" at={4.4} value={1} easing="ease-in-out" />
          </Effect>
        </Clip>
        <Transition id="x3" type="pixelDissolve" duration={0.8} />
        {/* Three glasses: a push-in that drifts towards the middle one. */}
        <Clip id="three" src="asset:espresso" in={24} out={31} fit="cover">
          <Effect id="three-warm" type="lut" params={{ src: "asset:warm" }} />
          <Keyframe id="three-sx-0" property="transform.scale.x" at={0} value={1.04} />
          <Keyframe id="three-sx-1" property="transform.scale.x" at={7} value={1.22} easing="easeInOutSine" />
          <Keyframe id="three-sy-0" property="transform.scale.y" at={0} value={1.04} />
          <Keyframe id="three-sy-1" property="transform.scale.y" at={7} value={1.22} easing="easeInOutSine" />
        </Clip>
        <Transition id="x4" type="clockWipe" duration={0.9} />
        {/* The red cup in steam, graded down so the closing line reads over it. */}
        <Clip id="close" src="asset:redCup" in={6} out={14} fit="cover" />
      </Track>

      <Track id="looks" name="Looks" layout="free">
        {/* The grade under the closing line: darker, cooler shadows, the red kept. */}
        <Adjustment id="grade" anchor="close" duration={{ until: "close" }}>
          <Effect id="grade-expose" type="exposure" params={{ stops: -0.9 }} />
          <Effect
            id="grade-tone"
            type="curves"
            params={{
              rgb: [
                [0, 0],
                [0.3, 0.2],
                [0.8, 0.82],
                [1, 1],
              ],
            }}
          />
          <Effect id="grade-pop" type="vibrance" params={{ amount: 0.4 }} />
        </Adjustment>
        {/* A dark fall-off from the left, under the closing line and clear of the cup. */}
        <Layer id="scrim" anchor="close" duration={{ until: "close" }} ground>
          <div
            style={{
              position: "absolute",
              inset: 0,
              background: "linear-gradient(90deg, #000000e0 0%, #000000b0 34%, #00000000 52%)",
            }}
          />
        </Layer>
        {/* A film look over the whole cut. */}
        <Adjustment id="film" start={0} duration="fill">
          <Effect id="film-grain" type="grain" params={{ amount: 0.22 }} />
          <Effect id="film-vignette" type="vignette" params={{ amount: 0.45 }} />
        </Adjustment>
      </Track>

      <Track id="words" name="Words" layout="free">
        <Title
          id="slow"
          anchor="open"
          offset={0.4}
          duration={4.6}
          font={display}
          size={168}
          weight={700}
          align="left"
          valign="bottom"
          width={1600}
          height={760}
          lineHeight={0.95}
          transform={{ position: { x: 0, y: -40 } }}
          shadow={LIFT}
          animation={{ preset: "word-by-word" }}
        >
          SLOW POUR.
        </Title>
        <Title
          id="slow-note"
          anchor="open"
          offset={1.2}
          duration={3.8}
          font={mono}
          size={34}
          weight={500}
          color={ACCENT}
          align="left"
          valign="bottom"
          width={1600}
          height={760}
          transform={{ position: { x: 0, y: 30 } }}
          shadow={LIFT}
          animation={{ preset: "fade" }}
        >
          POUR-OVER · 92 °C · 4 MIN
        </Title>
        <LowerThird
          id="method"
          anchor="pour"
          offset={0.5}
          duration={3.4}
          name="Bloom, then circles"
          role="Speed keys ease the pour into slow motion"
          x={-460}
        />
        <Callout
          id="held"
          anchor="pour"
          offset={4.3}
          duration={1.6}
          text="One frame, held"
          x={420}
          y={-300}
          to={{ x: 40, y: -40 }}
        />
        <Title
          id="fast"
          anchor="shot"
          offset={0.3}
          duration={2.8}
          font={display}
          size={168}
          weight={700}
          align="left"
          valign="bottom"
          width={1600}
          height={760}
          lineHeight={0.95}
          transform={{ position: { x: 0, y: -40 } }}
          shadow={LIFT}
          animation={{ preset: "word-by-word" }}
        >
          FAST SHOT.
        </Title>
        <Badge id="look" anchor="shot" offset={3.4} duration={4} text="Warm LUT" x={640} y={-380} size={44} />
        <Title
          id="every"
          anchor="three"
          offset={0.5}
          duration={5.4}
          font={display}
          size={112}
          weight={700}
          align="left"
          valign="top"
          width={1600}
          height={840}
          lineHeight={0.95}
          transform={{ position: { x: 0, y: 0 } }}
          shadow={LIFT}
          animation={{ preset: "word-by-word" }}
        >
          EVERY GLASS, A LINE OF CODE.
        </Title>
        {/* Placed by `uberscene blocks add quote-build --into coffee.tsx`; what this film needs is set here, on the tag. */}
        <Layer id="closing" anchor="close" duration={{ until: "close" }}>
          <QuoteBuild
            text="Every cut is a line you can read, change and render again."
            stress={["line", "read,", "change", "render"]}
            author="UberScene"
            role="Video editor as code"
            start={0.8}
            x={120}
            y={250}
            width={720}
            size={80}
          />
        </Layer>
      </Track>

      <Track id="sounds" name="Sound" role="effects" layout="free">
        <Audio id="cue-slow" src="asset:swish" anchor="open" offset={0.35} volume={0.6} />
        <Audio id="cue-x1" src="asset:whoosh" anchor="x1" offset={-0.15} volume={0.7} />
        <Audio id="cue-held" src="asset:click" anchor="pour" offset={4.2} volume={0.9} />
        <Audio id="cue-x2" src="asset:whoosh" anchor="x2" offset={-0.15} volume={0.7} />
        <Audio id="cue-fast" src="asset:swish" anchor="shot" offset={0.25} volume={0.6} />
        <Audio id="cue-look" src="asset:pop" anchor="shot" offset={3.4} volume={0.8} />
        <Audio id="cue-x3" src="asset:swish" anchor="x3" volume={0.6} />
        <Audio id="cue-x4" src="asset:whoosh" anchor="x4" offset={-0.15} volume={0.7} />
        {/* The riser climbs to the quote's last word; the chime lands with the name. */}
        <Audio id="cue-build" src="asset:riser" anchor="closing" offset={2.3} volume={0.45} />
        <Audio id="cue-end" src="asset:chime" anchor="closing" offset={4.5} volume={0.7} />
      </Track>
    </Composition>
  );
}
