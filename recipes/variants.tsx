import { z } from "zod";
import { Captions, Clip, Composition, THEME_NAMES, Title, Track } from "@cutcraft/kit";

/**
 * One cut, many variants. Everything that changes between a brand, a market
 * or an A/B test is a schema prop: the copy, the look, the brand colour, the
 * logo asset. The look is a built-in theme and the brand colour its primary,
 * so titles and captions take both through tokens. A variant is `defaults`
 * with overrides:
 *
 *   resolve(collectModule(file, { headline: "Software pequeño, nube real", theme: "paper", accent: "#ffcc00" }), manifest)
 *
 * The editor's tweaks panel edits the same props; a change folds into `defaults`.
 */
export const schema = z.object({
  headline: z.string().describe("Headline over the opening shot"),
  cta: z.string().describe("Closing line"),
  theme: z.enum(THEME_NAMES).describe("The look: a built-in theme"),
  accent: z.string().describe("Brand colour (the theme's primary)"),
  logo: z.string().describe("Logo asset reference"),
});

export const defaults = { headline: "Small software, real cloud", cta: "Try it today", theme: "midnight", accent: "#ff5a1f", logo: "asset:logo" };

export default function Video({ headline, cta, theme, accent, logo }: z.infer<typeof schema>) {
  return (
    <Composition fps={30} width={1920} height={1080} theme={{ extends: theme, palette: { primary: accent }, motion: "none" }}>
      <Track id="main" name="Footage">
        <Clip id="open" src="asset:product" in="shot:0" out="shot:0.end" fit="cover" />
        <Clip id="detail" src="asset:product" in="shot:2" out="shot:2.end" fit="cover" />
        <Clip id="card" src={logo} duration={3} fit="contain" transform={{ scale: 0.3 }} />
      </Track>

      <Track id="copy" name="Copy">
        <Title id="headline" anchor="open" offset={0.4} duration={4} style="h1" size={104} color="$primary" animation={{ preset: "slide-up", in: 0.4, out: 0.3 }}>
          {headline}
        </Title>
        <Title id="cta" anchor="card" offset={0.3} duration={2.5} style="h2" weight={500} valign="bottom" transform={{ position: { x: 0, y: -160 } }} animation={{ preset: "fade", in: 0.3, out: 0.3 }}>
          {cta}
        </Title>
      </Track>

      <Captions id="captions" style={{ position: "bottom", size: 40, highlight: "$primary" }} />
    </Composition>
  );
}
