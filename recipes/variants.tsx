import { z } from "zod";
import { Captions, Clip, Composition, Title, Track } from "@cutcut/kit";

/**
 * One cut, many variants. Everything that changes between a brand, a market
 * or an A/B test is a schema prop: the copy, the colour, the logo asset.
 * A variant is `defaults` with overrides:
 *
 *   resolve(collectModule(file, { headline: "Software pequeño, nube real", accent: "#ffcc00" }), manifest)
 *
 * The editor's tweaks panel edits the same props; a change folds into `defaults`.
 */
export const schema = z.object({
  headline: z.string().describe("Headline over the opening shot"),
  cta: z.string().describe("Closing line"),
  accent: z.string().describe("Brand colour"),
  logo: z.string().describe("Logo asset reference"),
});

export const defaults = { headline: "Small software, real cloud", cta: "Try it today", accent: "#ff5a1f", logo: "asset:logo" };

export default function Video({ headline, cta, accent, logo }: z.infer<typeof schema>) {
  return (
    <Composition fps={30} width={1920} height={1080} background={{ mode: "color", color: "#0b0d12" }}>
      <Track id="main" name="Footage">
        <Clip id="open" src="asset:product" in="shot:0" out="shot:0.end" fit="cover" />
        <Clip id="detail" src="asset:product" in="shot:2" out="shot:2.end" fit="cover" />
        <Clip id="card" src={logo} duration={3} fit="contain" transform={{ scale: 0.3 }} />
      </Track>

      <Track id="copy" name="Copy">
        <Title id="headline" anchor="open" offset={0.4} duration={4} size={104} weight={700} color={accent} animation={{ preset: "slide-up", in: 0.4, out: 0.3 }}>
          {headline}
        </Title>
        <Title id="cta" anchor="card" offset={0.3} duration={2.5} size={64} weight={500} valign="bottom" transform={{ position: { x: 0, y: -160 } }} animation={{ preset: "fade", in: 0.3, out: 0.3 }}>
          {cta}
        </Title>
      </Track>

      <Captions id="captions" style={{ position: "bottom", size: 40, highlight: accent }} />
    </Composition>
  );
}
