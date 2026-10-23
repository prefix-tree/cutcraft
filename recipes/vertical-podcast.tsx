import { z } from "zod";
import { Captions, Clip, Composition, Title, Track } from "@cutcut/kit";

export const schema = z.object({
  accent: z.string().describe("Name-tag and karaoke colour"),
});

export const defaults = { accent: "#5ad1ff" };

/**
 * A vertical clip from a landscape podcast. The composition is 9:16; each
 * sentence is its own clip with a crop that frames whoever speaks, chosen
 * from the transcript's speaker field. A name tag appears when the speaker
 * changes. Captions are generated, short, and coloured word by word.
 */
export default function Video({ accent }: z.infer<typeof schema>) {
  return (
    <Composition fps={30} width={1080} height={1920} background={{ mode: "color", color: "#000000" }}>
      <Track id="main" name="Dialogue" role="dialogue">
        {/* A 9:16 window on the 16:9 source: 0.3164 of the width is 1080 of 1920 scaled to the frame. */}
        <Clip id="s0" src="asset:podcast" in="word:0" out="word:4.end" fit="cover" transform={{ crop: { x: 0.08, y: 0, width: 0.3164, height: 1 } }} />
        <Clip id="s1" src="asset:podcast" in="word:5" out="word:8.end" fit="cover" transform={{ crop: { x: 0.6, y: 0, width: 0.3164, height: 1 } }} />
        <Clip id="s2" src="asset:podcast" in="word:9" out="word:15.end" fit="cover" transform={{ crop: { x: 0.08, y: 0, width: 0.3164, height: 1 } }} />
        <Clip id="s5" src="asset:podcast" in="word:35" out="word:49.end" fit="cover" transform={{ crop: { x: 0.6, y: 0, width: 0.3164, height: 1 } }} />
        <Clip id="s6" src="asset:podcast" in="word:50" out="word:52.end" fit="cover" transform={{ crop: { x: 0.08, y: 0, width: 0.3164, height: 1 } }} />
        <Clip id="s7" src="asset:podcast" in="word:53" out="word:63.end" fit="cover" transform={{ crop: { x: 0.6, y: 0, width: 0.3164, height: 1 } }} />
        <Clip id="s8" src="asset:podcast" in="word:64" out="word:66.end" fit="cover" transform={{ crop: { x: 0.08, y: 0, width: 0.3164, height: 1 } }} />
        <Clip id="s9" src="asset:podcast" in="word:67" out="word:79.end" fit="cover" transform={{ crop: { x: 0.6, y: 0, width: 0.3164, height: 1 } }} />
        <Clip id="s10" src="asset:podcast" in="word:80" out="word:84.end" fit="cover" transform={{ crop: { x: 0.08, y: 0, width: 0.3164, height: 1 } }} />
      </Track>

      <Track id="tags" name="Name tags">
        <Title id="tag-s0" anchor="s0" offset={0.2} duration={1.8} size={48} weight={700} color={accent} align="left" valign="bottom" transform={{ position: { x: 60, y: -360 } }} animation={{ preset: "slide-left", in: 0.3, out: 0.2 }}>
          Ana
        </Title>
        <Title id="tag-s1" anchor="s1" offset={0.2} duration={1.8} size={48} weight={700} color={accent} align="left" valign="bottom" transform={{ position: { x: 60, y: -360 } }} animation={{ preset: "slide-left", in: 0.3, out: 0.2 }}>
          Ben
        </Title>
        <Title id="tag-s2" anchor="s2" offset={0.2} duration={1.8} size={48} weight={700} color={accent} align="left" valign="bottom" transform={{ position: { x: 60, y: -360 } }} animation={{ preset: "slide-left", in: 0.3, out: 0.2 }}>
          Ana
        </Title>
        <Title id="tag-s5" anchor="s5" offset={0.2} duration={1.8} size={48} weight={700} color={accent} align="left" valign="bottom" transform={{ position: { x: 60, y: -360 } }} animation={{ preset: "slide-left", in: 0.3, out: 0.2 }}>
          Ben
        </Title>
        <Title id="tag-s6" anchor="s6" offset={0.2} duration={1.8} size={48} weight={700} color={accent} align="left" valign="bottom" transform={{ position: { x: 60, y: -360 } }} animation={{ preset: "slide-left", in: 0.3, out: 0.2 }}>
          Ana
        </Title>
        <Title id="tag-s7" anchor="s7" offset={0.2} duration={1.8} size={48} weight={700} color={accent} align="left" valign="bottom" transform={{ position: { x: 60, y: -360 } }} animation={{ preset: "slide-left", in: 0.3, out: 0.2 }}>
          Ben
        </Title>
        <Title id="tag-s8" anchor="s8" offset={0.2} duration={1.8} size={48} weight={700} color={accent} align="left" valign="bottom" transform={{ position: { x: 60, y: -360 } }} animation={{ preset: "slide-left", in: 0.3, out: 0.2 }}>
          Ana
        </Title>
        <Title id="tag-s9" anchor="s9" offset={0.2} duration={1.8} size={48} weight={700} color={accent} align="left" valign="bottom" transform={{ position: { x: 60, y: -360 } }} animation={{ preset: "slide-left", in: 0.3, out: 0.2 }}>
          Ben
        </Title>
        <Title id="tag-s10" anchor="s10" offset={0.2} duration={1.8} size={48} weight={700} color={accent} align="left" valign="bottom" transform={{ position: { x: 60, y: -360 } }} animation={{ preset: "slide-left", in: 0.3, out: 0.2 }}>
          Ana
        </Title>
      </Track>

      <Captions id="captions" src="asset:podcast" style={{ position: "bottom", size: 56, highlight: accent }} animation="karaoke" maxChars={28} />
    </Composition>
  );
}
