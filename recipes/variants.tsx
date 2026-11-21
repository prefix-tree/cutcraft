import { z } from "zod";

import { Captions, Clip, Composition, knob, THEME_NAMES, Title, Track } from "@uberscene/kit";

/**
 * One cut, many variants. Everything that changes between a brand, a market
 * or an A/B test is a schema prop: the copy, the look, the brand colour, the
 * logo asset. The look is a built-in theme and the brand colour its primary,
 * so titles and captions take both through tokens. A variant is `defaults`
 * with overrides:
 *
 *   resolve(collectModule(file, { headline: "Café fresco, mañanas lentas", theme: "paper", accent: "#ffcc00" }), manifest)
 *
 * The editor's tweaks panel edits the same props; a change folds into `defaults`.
 */
export const schema = z.object({
  headline: z.string().describe("Headline over the opening shot"),
  cta: z.string().describe("Closing line"),
  theme: z.enum(THEME_NAMES).describe("The look: a built-in theme"),
  accent: knob.color().describe("Brand colour (the theme's primary)"),
  logo: knob.image().describe("Logo asset reference"),
});

export const defaults = {
  headline: "Fresh coffee, slow mornings",
  cta: "Visit us today",
  theme: "midnight",
  accent: "#ff5a1f",
  logo: "asset:logo",
};

export default function Video({ headline, cta, theme, accent, logo }: z.infer<typeof schema>) {
  return (
    <Composition
      fps={30}
      width={1920}
      height={1080}
      theme={{ extends: theme, palette: { primary: accent }, motion: "none" }}
    >
      <Track id="main" name="Footage">
        <Clip id="open" src="asset:product" in="shot:0" out="shot:0.end" fit="cover" />
        <Clip id="detail" src="asset:product" in="shot:2" out="shot:2.end" fit="cover" />
        <Clip id="card" src={logo} duration={3} fit="contain" transform={{ scale: 0.3 }} />
      </Track>

      <Track id="copy" name="Copy">
        <Title
          id="headline"
          anchor="open"
          offset={0.4}
          duration={4}
          style={{ preset: "h1", size: 104, color: "$primary" }}
          animation={{ type: "slideUp", in: 0.4, out: 0.3 }}
        >
          {headline}
        </Title>
        <Title
          id="cta"
          anchor="card"
          offset={0.3}
          duration={2.5}
          style={{ preset: "h2", weight: 500, valign: "bottom" }}
          box={{ x: 960, y: 380, origin: "center" }}
          animation={{ type: "fade", in: 0.3, out: 0.3 }}
        >
          {cta}
        </Title>
      </Track>

      <Captions id="captions" style={{ size: 40, highlight: "$primary" }} />
    </Composition>
  );
}
