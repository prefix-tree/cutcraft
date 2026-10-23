import { z } from "zod";
import { Audio, Captions, Clip, Composition, Title, Track } from "@cutcut/kit";

export const schema = z.object({
  title: z.string().describe("Episode title shown over the first sentence"),
  accent: z.string().describe("Accent colour for the title"),
});

export const defaults = { title: "Why a file?", accent: "#ff5a1f" };

/**
 * A talking-head cut from a transcript. Every clip is one sentence, trimmed
 * by words, so a re-transcription or a retrim keeps the edit. The flubbed
 * take and "let me say that again" are left out; the last take stays.
 */
export default function Video({ title, accent }: z.infer<typeof schema>) {
  return (
    <Composition fps={30} width={1920} height={1080} background={{ mode: "color", color: "#0b0d12" }}>
      <Track id="main" name="Dialogue" role="dialogue">
        <Clip id="welcome" src="asset:podcast" in="word:0" out="word:4.end" />
        <Clip id="thanks" src="asset:podcast" in="word:5" out="word:8.end" />
        <Clip id="question" src="asset:podcast" in="word:9" out="word:15.end" />
        {/* The second take of the answer; the first and the "say that again" are dropped. */}
        <Clip id="answer" src="asset:podcast" in="word:35" out="word:49.end" />
        <Clip id="why" src="asset:podcast" in="word:50" out="word:52.end" />
        <Clip id="because" src="asset:podcast" in="word:53" out="word:63.end" />
        <Clip id="editor-q" src="asset:podcast" in="word:64" out="word:66.end" />
        <Clip id="editor-a" src="asset:podcast" in="word:67" out="word:79.end" />
        <Clip id="close" src="asset:podcast" in="word:80" out="word:84.end" />
      </Track>

      <Track id="overlays" name="Overlays">
        <Title id="title" anchor="welcome" offset={0.3} duration={3} size={96} weight={700} color={accent} valign="top" transform={{ position: { x: 0, y: 120 } }} animation={{ preset: "slide-up", in: 0.4, out: 0.3 }}>
          {title}
        </Title>
      </Track>

      <Track id="music" layout="free" role="music">
        <Audio id="bed" src="asset:music" start={0} duration="fill" volume={0.3} fade={{ in: 0.5, out: 1.5 }} duck={{ under: "main", to: 0.12 }} />
      </Track>

      {/* Cues come from the words the timeline plays, one per sentence, and follow every trim. */}
      <Captions id="captions" src="asset:podcast" style={{ position: "bottom", size: 44 }} animation="word-highlight" />
    </Composition>
  );
}
