import { z } from "zod";
import {
  Adjustment, Angle, Audio, AudioEffect, Caption, Captions, Clip, ColorGrade, Composition, Cut, Effect, Freeze, Gap,
  Keyframe, Layer, Marker, Mask, Multicam, Nested, Shape, SpeedKey, Sticker, Svg, Title, Track, Transition, useT,
} from "@cut/kit";

export const schema = z.object({
  title: z.string(),
  accent: z.string(),
});

export const defaults = { title: "Why we built it", accent: "#ff5a1f" };

export default function Video({ title, accent }: z.infer<typeof schema>) {
  return (
    <Composition fps={30} width={1920} height={1080} background={{ mode: "color", color: "#000000" }}>
      <Marker id="m1" at={2} label="hook" color="#ffcc00" />
      <Track id="main" name="Main">
        <Clip id="c1" src="asset:interview" in="word:3" out="word:18">
          <Effect id="fx1" type="blur" params={{ radius: 4 }} />
          <ColorGrade id="cg1" temperature={10} tint={-5} />
          <Keyframe id="k1" property="transform.opacity" at={0} value={0} easing="easeOutCubic" />
          <Keyframe id="k2" property="transform.opacity" at={0.5} value={1} />
          <Mask id="mk1" shape={{ rect: { x: 0.1, y: 0.1, width: 0.8, height: 0.8 } }} feather={12} />
        </Clip>
        <Transition id="x1" type="crossfade" duration={0.5} />
        <Clip id="c2" src="asset:city" duration={4} fit="cover" transform={{ scale: 1.1 }}>
          <SpeedKey id="sk1" at={0} speed={1} />
          <SpeedKey id="sk2" at={2} speed={0.5} easing="easeInOutQuad" />
          <Freeze id="fr1" at={1.5} start={3} duration={0.5} />
        </Clip>
        <Gap id="g1" duration={1} />
        <Clip id="c3" src="asset:interview" in="shot:2" out="shot:2.end" speed={1.2} />
        <Nested id="n1" of={Outro} duration={3} volume={0.8} />
      </Track>
      <Track id="overlays" name="Overlays">
        <Title id="t1" anchor="c1" offset={1} duration={3} color={accent} size={64} animation={{ preset: "slide-up", in: 0.4, out: 0.3 }}>
          {title}
        </Title>
        <Shape id="s1" anchor="c2" duration={2} shape="rectangle" width={400} height={80} fill="#ffffff" cornerRadius={12} />
        <Svg id="v1" anchor="start" offset={0.5} duration={2} content="<svg viewBox='0 0 10 10'><circle cx='5' cy='5' r='4'/></svg>" />
        <Sticker id="st1" anchor="c3" duration={2} src="sticker:party" emphasis="pulse" />
        <Layer id="l1" anchor="c2" duration={4}>
          <Counter from={0} to={1200} />
        </Layer>
        <Adjustment id="adj1" anchor="start" duration="fill" affects={["main"]}>
          <Effect id="fx2" type="vignette" params={{ amount: 30 }} />
        </Adjustment>
        <Badge id="b1" anchor="c1" label="LIVE" />
        <Badge id="b2" anchor="c3" label="REPLAY" />
      </Track>
      <Track id="music" layout="free" role="music">
        <Audio id="a1" src="asset:bed" start={0} duration="fill" volume={0.2} duck={{ under: "main", to: 0.05 }}>
          <AudioEffect id="ae1" type="compressor" params={{ threshold: -18, ratio: 4 }} />
        </Audio>
      </Track>
      <Track id="mc" layout="free" hidden>
        <Multicam id="mc1" sync={0}>
          <Angle id="an1" src="asset:interview" />
          <Angle id="an2" src="asset:city" offset={0} />
          <Cut id="cu1" at={0} angle="an1" />
          <Cut id="cu2" at={2} angle="an2" />
        </Multicam>
      </Track>
      <Captions id="cap" src="asset:interview" animation="karaoke" style={{ position: "bottom", size: 42 }}>
        <Caption id="cp1" start="word:3" end="word:6.end" text="Hello and welcome back" />
        <Caption id="cp2" start={4} end={6} text="to the show" />
      </Captions>
    </Composition>
  );
}

function Outro() {
  return <Track id="outro"><Clip id="oc1" src="asset:city" in={0} out={3} /></Track>;
}

function Badge({ id, anchor, label }: { id: string; anchor: string; label: string }) {
  return <Title id={id} anchor={anchor} offset={0.2} duration={1.5} size={28} color="#ffffff">{label}</Title>;
}

function Counter({ from, to }: { from: number; to: number }) {
  const t = useT();
  return <div>{Math.round(from + (to - from) * t)}</div>;
}
