import { Audio, Clip, Composition, Effect, Keyframe, Title, Track } from "@cutcut/kit";
import type { ReactElement } from "react";

/**
 * A synthetic project of `n` clips for benchmarks: three sequence tracks of
 * short clips (every fourth one keyframed with an effect), a free overlay
 * track of titles anchored to clips, and one audio bed. Uses the sample
 * manifest's assets. Deterministic; no source text, so nothing is "generated".
 */
export function buildLarge(n: number): { default: () => ReactElement; defaults: Record<string, never> } {
  const tracks: ReactElement[][] = [[], [], []];
  for (let i = 0; i < n; i++) {
    const city = i % 2 === 1;
    const inSec = city ? (i * 3) % 9 : (i * 7) % 50;
    const length = 1 + (i % 3);
    const children = i % 4 === 0
      ? [
        <Keyframe key="k1" id={`c${i}k1`} property="transform.opacity" at={0} value={0} easing="easeOutCubic" />,
        <Keyframe key="k2" id={`c${i}k2`} property="transform.opacity" at={0.5} value={1} />,
        <Effect key="fx" id={`c${i}fx`} type="blur" params={{ radius: 2 }} />,
      ]
      : [];
    tracks[i % 3]!.push(
      <Clip key={`c${i}`} id={`c${i}`} src={city ? "asset:city" : "asset:interview"} in={inSec} out={inSec + length} fit="cover">
        {children}
      </Clip>,
    );
  }
  const titles: ReactElement[] = [];
  for (let k = 0; k * 4 < n; k++) {
    titles.push(<Title key={`t${k}`} id={`t${k}`} anchor={`c${k * 4}`} offset={0.2} duration={1} size={40}>{`Title ${k}`}</Title>);
  }
  const element = (
    <Composition fps={30} width={1920} height={1080}>
      <Track id="v1">{tracks[0]}</Track>
      <Track id="v2">{tracks[1]}</Track>
      <Track id="v3">{tracks[2]}</Track>
      <Track id="overlays">{titles}</Track>
      <Track id="music" layout="free" role="music">
        <Audio id="bed" src="asset:bed" start={0} duration="fill" volume={0.2} duck={{ under: "v1", to: 0.1 }} />
      </Track>
    </Composition>
  );
  return { default: () => element, defaults: {} };
}
