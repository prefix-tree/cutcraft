import { z } from "zod";
import { Clip, Composition, Graphic, THEME_NAMES, Title, Track } from "@cutcut/kit";

/**
 * A twelve-second spot made of graphics around one screen recording. The look
 * is one prop: every colour, font, radius and entrance comes from the theme,
 * through tokens and presets, so `theme` swaps it without touching the edit.
 *
 *   resolve(collectModule(file, { theme: "paper" }), manifest)
 */
export const schema = z.object({
  theme: z.enum(THEME_NAMES).describe("The look: one of the built-in themes"),
  product: z.string().describe("Product name"),
  tagline: z.string().describe("One line under the name"),
  cta: z.string().describe("Call to action on the closing card"),
});

export const defaults = { theme: "midnight", product: "Shed", tagline: "A cloud for small software", cta: "Try it free" };

export default function Video({ theme, product, tagline, cta }: z.infer<typeof schema>) {
  return (
    <Composition fps={30} width={1920} height={1080} theme={{ extends: theme }}>
      {/* The bottom of the picture: a soft backdrop in the palette, for the whole spot. */}
      <Track id="backdrop" layout="free" name="Backdrop">
        <Graphic id="blobs" kind="blobs-background" start={0} duration={12} />
      </Track>

      <Track id="screen" layout="free" name="Screen">
        <Clip id="demo" src="asset:screen" in={2} out={8} start={4} fit="contain" transform={{ scale: 0.62, position: { x: 260, y: 40 } }} />
        {/* Sized to the clip: 1190 x 670 of screen under a 51 px title bar. */}
        <Graphic id="window" kind="device-frame" anchor="demo" duration={6} width={1196} height={724} transform={{ position: { x: 260, y: 16 } }} />
      </Track>

      <Track id="open" layout="free" name="Opening">
        <Title id="kicker" start={0.3} duration={3.5} style="kicker" transform={{ position: { x: 0, y: -170 } }}>INTRODUCING</Title>
        <Title id="name" start={0.5} duration={3.3} style="h1" size={180}>{product}</Title>
        <Graphic id="swoosh" kind="underline" start={1.1} duration={2.7} width={520} height={44} enter={{ type: "draw", duration: 0.7 }} transform={{ position: { x: 0, y: 110 } }} />
        <Title id="tagline" start={1.4} duration={2.4} style="body" transform={{ position: { x: 0, y: 200 } }}>{tagline}</Title>
      </Track>

      <Track id="notes" layout="free" name="Notes">
        <Graphic id="step-1" kind="callout" anchor="demo" offset={0.6} duration={2.4} text="Push your code" tail="right" transform={{ position: { x: -620, y: -120 } }} />
        <Graphic id="step-2" kind="callout" anchor="demo" offset={3} duration={2.8} text="It is live" tail="right" transform={{ position: { x: -620, y: 120 } }} />
        <Graphic id="steps" kind="steps" anchor="demo" offset={0.6} duration={5.2} count={2} active={1} transform={{ position: { x: -620, y: 300 } }} />
        <Graphic id="live" kind="pill" anchor="demo" offset={3.2} duration={2.6} text="Live" dot="#ff3b30" transform={{ position: { x: 740, y: -300 } }} />
      </Track>

      <Track id="close" layout="free" name="Closing">
        <Title id="end-name" start={10} duration={2} style="h2" transform={{ position: { x: 0, y: -120 } }}>{product}</Title>
        <Graphic id="end-cta" kind="pill" start={10.3} duration={1.7} text={cta} size={48} transform={{ position: { x: 0, y: 40 } }} />
        <Graphic id="end-badge" kind="burst" start={10.6} duration={1.4} text="FREE" size={36} transform={{ position: { x: 300, y: -40 }, rotation: 12 }} />
        <Graphic id="party" kind="confetti" start={10.3} duration={1.7} />
      </Track>
    </Composition>
  );
}
