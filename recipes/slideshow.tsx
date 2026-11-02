import { z } from "zod";
import { Audio, Clip, Composition, Keyframe, Title, Track, Transition } from "@cutcraft/kit";

export const schema = z.object({
  title: z.string().describe("Opening title"),
});

export const defaults = { title: "Summer, mostly" };

/** Four photos held four seconds each, a slow push on every one, crossfades between, a bed that fades out at the end. */
export default function Video({ title }: z.infer<typeof schema>) {
  return (
    <Composition fps={30} width={1920} height={1080} background={{ mode: "color", color: "#000000" }}>
      <Track id="photos" name="Photos">
        <Photo id="p1" src="asset:photo-1" from={1} to={1.12} />
        <Transition id="x1" type="crossfade" duration={0.6} />
        <Photo id="p2" src="asset:photo-2" from={1.12} to={1} />
        <Transition id="x2" type="crossfade" duration={0.6} />
        <Photo id="p3" src="asset:photo-3" from={1} to={1.1} />
        <Transition id="x3" type="crossfade" duration={0.6} />
        <Photo id="p4" src="asset:photo-4" from={1.1} to={1} />
      </Track>

      <Track id="overlays" name="Overlays">
        <Title id="title" anchor="start" offset={0.5} duration={3} size={110} weight={300} animation={{ preset: "fade", in: 0.8, out: 0.6 }}>
          {title}
        </Title>
      </Track>

      <Track id="music" layout="free" role="music">
        <Audio id="bed" src="asset:music" start={0} duration="fill" volume={0.6} fade={{ in: 1, out: 2 }} />
      </Track>
    </Composition>
  );
}

/** A held photo with a push from `from` to `to`; used four times, so the editor sees generated elements until it bakes one. */
function Photo({ id, src, from, to }: { id: string; src: string; from: number; to: number }) {
  return (
    <Clip id={id} src={src} duration={4} fit="cover">
      <Keyframe id={`${id}-sx0`} property="transform.scale.x" at={0} value={from} easing="easeInOutSine" />
      <Keyframe id={`${id}-sx1`} property="transform.scale.x" at={4} value={to} />
      <Keyframe id={`${id}-sy0`} property="transform.scale.y" at={0} value={from} easing="easeInOutSine" />
      <Keyframe id={`${id}-sy1`} property="transform.scale.y" at={4} value={to} />
    </Clip>
  );
}
