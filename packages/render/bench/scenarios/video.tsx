// The comparison's scenarios (see the bench/compare branch), CutCraft alone: one cut file builds the one named in its props.
import { Clip, Composition, Keyframe, Shape, Title, Track, Transition, type AssetManifest } from "@cutcut/kit";
import { GRAPHIC_TITLES, GRAPHIC_TITLE_LENGTH, HEIGHT, SCENARIOS, WIDTH, FPS } from "./scenarios";

export const manifest: AssetManifest = {
  assets: { footage: { id: "footage", kind: "video", duration: 60, fps: 30, width: 1920, height: 1080 } },
};

export const defaults = { scenario: "cuts" };

const TITLE = { size: 96, weight: 700, color: "#ffffff", enter: { type: "fade", duration: 0.4 }, exit: { type: "none" } } as const;

export default function Video({ scenario }: { scenario: string }) {
  const s = SCENARIOS.find((x) => x.name === scenario)!;
  return (
    <Composition fps={FPS} width={WIDTH} height={HEIGHT} background={{ mode: "color", color: "#101014" }}>
      {s.clips.length > 0 && (
        <Track id="main">
          {s.clips.flatMap(([a, b], i) => [
            ...(i > 0 && s.crossfade > 0 ? [<Transition key={`x${i}`} id={`x${i}`} type="crossfade" duration={s.crossfade} />] : []),
            <Clip key={`c${i}`} id={`c${i}`} src="asset:footage" in={a} out={b} fit="cover" />,
          ])}
        </Track>
      )}
      {s.titles.length > 0 && (
        <Track id="titles" layout="free">
          {s.titles.map((t) => <Title key={`t${t.clip}`} id={`t${t.clip}`} anchor={`c${t.clip}`} offset={0.3} duration={3} {...TITLE} transform={{ position: { x: 0, y: 300 } }}>{t.text}</Title>)}
        </Track>
      )}
      {s.boxes.length > 0 && (
        <Track id="boxes" layout="free">
          {s.boxes.map((b, i) => (
            <Shape key={`b${i}`} id={`b${i}`} shape="rectangle" width={b.size} height={b.size} fill={b.color} start={b.start} duration={b.end - b.start} transform={{ position: { x: b.from[0], y: b.from[1] } }}>
              <Keyframe id={`b${i}-x0`} property="transform.position.x" at={0} value={b.from[0]} />
              <Keyframe id={`b${i}-x1`} property="transform.position.x" at={b.end - b.start} value={b.to[0]} />
              <Keyframe id={`b${i}-y0`} property="transform.position.y" at={0} value={b.from[1]} />
              <Keyframe id={`b${i}-y1`} property="transform.position.y" at={b.end - b.start} value={b.to[1]} />
            </Shape>
          ))}
          {GRAPHIC_TITLES.map((t, i) => <Title key={`g${i}`} id={`g${i}`} start={t.at} duration={GRAPHIC_TITLE_LENGTH} {...TITLE}>{t.text}</Title>)}
        </Track>
      )}
    </Composition>
  );
}
