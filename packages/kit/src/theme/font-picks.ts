/**
 * The Google Fonts families the catalogue offers, chosen by hand: what each looks like and what it is for. Which
 * weights and italics each has is not written here; `scripts/gen-font-catalog.ts` reads that from Google and writes
 * `font-faces.generated.ts`. Add a family here, then run `pnpm --filter @uberscene/kit gen:fonts`.
 */
export type FontCategory = "sans" | "serif" | "slab" | "condensed" | "display" | "handwriting" | "mono";

/** What a family does well in a video: a headline, running text, captions, figures, or one word for colour. */
export type FontRole = "headline" | "body" | "captions" | "numbers" | "accent";

export interface FontPick {
  readonly family: string;
  readonly category: FontCategory;
  readonly roles: readonly FontRole[];
  /** One plain line on how it looks and where it fits. */
  readonly feel: string;
  /** Families in the catalogue it sits well beside. */
  readonly pairs: readonly string[];
}

const pick = (
  family: string,
  category: FontCategory,
  roles: readonly FontRole[],
  feel: string,
  pairs: readonly string[],
): FontPick => ({ family, category, roles, feel, pairs });

/** The five families both renderers ship; no declaration needed. */
export const BUNDLED_PICKS: readonly FontPick[] = [
  pick(
    "Inter",
    "sans",
    ["body", "captions", "numbers"],
    "Neutral, very legible sans; the safe choice for anything small",
    ["Space Grotesk", "Playfair Display", "Bebas Neue"],
  ),
  pick(
    "Space Grotesk",
    "sans",
    ["headline", "captions", "numbers"],
    "Geometric sans with quirky details; technical, modern, good in bold",
    ["Inter", "JetBrains Mono"],
  ),
  pick(
    "Playfair Display",
    "serif",
    ["headline", "accent"],
    "High-contrast display serif; editorial, elegant, for large sizes",
    ["DM Sans", "Inter"],
  ),
  pick("DM Sans", "sans", ["body", "captions", "headline"], "Low-contrast geometric sans; friendly and clean", [
    "Playfair Display",
    "DM Serif Display",
  ]),
  pick(
    "JetBrains Mono",
    "mono",
    ["numbers", "accent"],
    "Monospace made for code; for terminals, code and data labels",
    ["Space Grotesk", "Inter"],
  ),
];

export const GOOGLE_PICKS: readonly FontPick[] = [
  // Condensed: tall and narrow, so a long headline fits a vertical frame.
  pick(
    "Bebas Neue",
    "condensed",
    ["headline"],
    "All-caps condensed poster face, one weight; the classic loud headline",
    ["Inter", "Montserrat", "Lora"],
  ),
  pick("Anton", "condensed", ["headline"], "Very heavy condensed sans, one weight; impact headlines and thumbnails", [
    "Inter",
    "Work Sans",
  ]),
  pick(
    "Oswald",
    "condensed",
    ["headline", "captions", "numbers"],
    "Condensed gothic in six weights; news and sport, reads well in caps",
    ["Inter", "Lora", "Source Serif 4"],
  ),
  pick(
    "Barlow Condensed",
    "condensed",
    ["headline", "captions", "numbers"],
    "Rounded-corner condensed grotesque in nine weights with italics; road signs, sport, tech",
    ["Inter", "Work Sans"],
  ),
  pick(
    "Archivo Narrow",
    "condensed",
    ["headline", "captions", "body"],
    "Narrow grotesque that stays legible small; dense captions and labels",
    ["Archivo", "Archivo Black"],
  ),
  pick("Fjalla One", "condensed", ["headline"], "Medium-weight condensed sans, one weight; calmer than Anton", [
    "Inter",
    "Lora",
  ]),
  pick(
    "League Gothic",
    "condensed",
    ["headline"],
    "Very narrow revival gothic, one weight; tall vintage poster lines",
    ["Libre Baskerville", "Inter"],
  ),
  pick(
    "Antonio",
    "condensed",
    ["headline", "numbers"],
    "Refined condensed sans from thin to bold; fashion and film titles",
    ["Inter", "EB Garamond"],
  ),
  pick(
    "Saira Condensed",
    "condensed",
    ["headline", "numbers"],
    "Squared condensed sans in nine weights; motorsport, gaming, scoreboards",
    ["Inter", "Space Mono"],
  ),

  // Sans: the workhorses.
  pick("Inter Tight", "sans", ["headline", "body", "captions"], "Inter with tighter spacing, made for large sizes", [
    "Instrument Serif",
    "Fraunces",
  ]),
  pick(
    "Montserrat",
    "sans",
    ["headline", "body", "captions"],
    "Wide geometric sans; confident, familiar from social video",
    ["Bebas Neue", "Lora"],
  ),
  pick(
    "Poppins",
    "sans",
    ["headline", "body", "captions"],
    "Round geometric sans; friendly, the common look of creator captions",
    ["Lora", "Anton"],
  ),
  pick(
    "Manrope",
    "sans",
    ["headline", "body", "captions", "numbers"],
    "Modern grotesque with open shapes; product and tech",
    ["Fraunces", "DM Mono"],
  ),
  pick("Outfit", "sans", ["headline", "body"], "Clean geometric sans with a brand feel; simple and even", [
    "Fraunces",
    "Instrument Serif",
  ]),
  pick(
    "Plus Jakarta Sans",
    "sans",
    ["headline", "body", "captions"],
    "Slightly rounded modern sans; startups and apps",
    ["Instrument Serif", "DM Mono"],
  ),
  pick("Sora", "sans", ["headline", "body"], "Wide geometric sans with a technical feel; good for short lines", [
    "Inter",
    "Space Mono",
  ]),
  pick("Urbanist", "sans", ["headline", "body"], "Light geometric sans; airy, fashion and lifestyle", [
    "Cormorant Garamond",
    "Inter",
  ]),
  pick(
    "Work Sans",
    "sans",
    ["body", "captions", "headline"],
    "Sturdy grotesque tuned for screens; plain and dependable",
    ["Anton", "Bitter"],
  ),
  pick(
    "Archivo",
    "sans",
    ["headline", "body", "captions"],
    "Grotesque built for headlines and text alike; sport and news",
    ["Archivo Black", "Archivo Narrow"],
  ),
  pick(
    "Figtree",
    "sans",
    ["body", "captions", "headline"],
    "Friendly, simple geometric sans; clean without being cold",
    ["Fraunces", "Young Serif"],
  ),
  pick(
    "Nunito",
    "sans",
    ["body", "captions", "headline"],
    "Rounded sans; soft, warm, for children's and wellbeing topics",
    ["Titan One", "Lora"],
  ),
  pick(
    "Rubik",
    "sans",
    ["headline", "body", "captions"],
    "Sans with slightly rounded corners; chunky and approachable in bold",
    ["Rubik Mono One", "Inter"],
  ),
  pick(
    "Lexend",
    "sans",
    ["body", "captions", "headline"],
    "Wide, open sans designed for easy reading; captions people must not miss",
    ["Fraunces", "Inter"],
  ),
  pick("Syne", "sans", ["headline", "accent"], "Eccentric wide sans, extreme in bold; art, music, culture", [
    "Inter",
    "Space Mono",
  ]),
  pick("Unbounded", "sans", ["headline", "accent"], "Very wide rounded display sans; futuristic, for a few words", [
    "Inter",
    "Manrope",
  ]),
  pick(
    "Bricolage Grotesque",
    "sans",
    ["headline", "body"],
    "Characterful grotesque with ink traps; contemporary editorial",
    ["Instrument Serif", "Inter"],
  ),
  pick(
    "Instrument Sans",
    "sans",
    ["headline", "body", "captions"],
    "Precise, slightly condensed modern sans; quiet brand work",
    ["Instrument Serif"],
  ),
  pick("Roboto", "sans", ["body", "captions", "numbers"], "The Android sans; neutral, reads as an interface", [
    "Roboto Slab",
    "Roboto Mono",
  ]),

  // Serif.
  pick(
    "Fraunces",
    "serif",
    ["headline", "accent"],
    "Soft, wobbly old-style display serif; warm, craft, food and coffee",
    ["Inter Tight", "Manrope", "Figtree"],
  ),
  pick(
    "DM Serif Display",
    "serif",
    ["headline", "accent"],
    "High-contrast display serif, one weight with italic; pairs with DM Sans",
    ["DM Sans", "Inter"],
  ),
  pick(
    "Instrument Serif",
    "serif",
    ["headline", "accent"],
    "Condensed display serif, one weight with italic; the current editorial look",
    ["Instrument Sans", "Inter Tight"],
  ),
  pick(
    "Cormorant Garamond",
    "serif",
    ["headline", "accent"],
    "Delicate display Garamond; luxury, weddings, slow pacing",
    ["Urbanist", "Montserrat"],
  ),
  pick(
    "Lora",
    "serif",
    ["body", "headline", "captions"],
    "Calligraphic text serif; stories and quotes, readable small",
    ["Montserrat", "Oswald"],
  ),
  pick(
    "Libre Baskerville",
    "serif",
    ["body", "headline"],
    "Classic book serif tuned for screens; history, literature",
    ["League Gothic", "Inter"],
  ),
  pick(
    "Source Serif 4",
    "serif",
    ["body", "captions", "headline"],
    "Even, modern text serif; documentary and explainers",
    ["Oswald", "Inter"],
  ),
  pick("Newsreader", "serif", ["body", "headline"], "Newspaper text serif; journalism and long quotes", [
    "Inter",
    "Oswald",
  ]),
  pick("EB Garamond", "serif", ["body", "headline", "accent"], "Faithful Garamond revival; classical, academic", [
    "Antonio",
    "Inter",
  ]),
  pick("Bodoni Moda", "serif", ["headline", "accent"], "Hairline-contrast didone; fashion magazine mastheads", [
    "Inter",
    "Urbanist",
  ]),
  pick("Abril Fatface", "serif", ["headline", "accent"], "Very heavy didone, one weight; a single dramatic word", [
    "Lora",
    "Work Sans",
  ]),
  pick(
    "Young Serif",
    "serif",
    ["headline", "accent"],
    "Sturdy old-style display serif, one weight; friendly and bookish",
    ["Figtree", "Inter"],
  ),

  // Slab.
  pick("Roboto Slab", "slab", ["headline", "body"], "Plain geometric slab; practical, pairs with Roboto", [
    "Roboto",
    "Inter",
  ]),
  pick("Zilla Slab", "slab", ["headline", "body"], "Smooth contemporary slab; tech with some warmth", [
    "Inter",
    "Work Sans",
  ]),
  pick(
    "Alfa Slab One",
    "slab",
    ["headline", "accent"],
    "Very heavy slab, one weight; western posters, bold statements",
    ["Work Sans", "Lora"],
  ),
  pick(
    "Bitter",
    "slab",
    ["body", "headline", "captions"],
    "Text slab made for screens; sturdy captions on busy footage",
    ["Work Sans", "Inter"],
  ),
  pick("Arvo", "slab", ["headline", "body"], "Geometric slab with a typewriter air; retro and practical", [
    "Inter",
    "Lora",
  ]),

  // Display: for one or two words.
  pick(
    "Titan One",
    "display",
    ["headline", "accent"],
    "Fat rounded display face, one weight; playful, cartoons, games",
    ["Nunito", "Inter"],
  ),
  pick("Archivo Black", "display", ["headline"], "Heavy grotesque, one weight; blunt headlines without condensing", [
    "Archivo",
    "Inter",
  ]),
  pick("Bangers", "display", ["headline", "accent"], "Comic-book caps, one weight; jokes and reactions", [
    "Inter",
    "Nunito",
  ]),
  pick("Righteous", "display", ["headline", "accent"], "Art-deco rounded display, one weight; retro-futurist", [
    "Inter",
    "Manrope",
  ]),
  pick("Bungee", "display", ["headline", "accent"], "Blocky signage caps, one weight; street signs, urban", [
    "Inter",
    "Work Sans",
  ]),
  pick("Luckiest Guy", "display", ["headline", "accent"], "Heavy bouncy caps, one weight; kids, snacks, cartoons", [
    "Nunito",
    "Inter",
  ]),
  pick("Rubik Mono One", "display", ["headline", "accent"], "Very heavy wide caps, one weight; a single shouted word", [
    "Rubik",
    "Inter",
  ]),
  pick(
    "Dela Gothic One",
    "display",
    ["headline", "accent"],
    "Heavy brushy gothic, one weight; punchy, Japanese poster feel",
    ["Inter", "Manrope"],
  ),
  pick("Black Ops One", "display", ["headline", "accent"], "Military stencil, one weight; action and gaming", [
    "Saira Condensed",
    "Inter",
  ]),
  pick(
    "Press Start 2P",
    "display",
    ["accent", "numbers"],
    "8-bit pixel face, one weight; retro games, use small and sparingly",
    ["Space Mono", "Inter"],
  ),

  // Handwriting: for an aside, an arrow label, a signature.
  pick(
    "Caveat",
    "handwriting",
    ["accent", "captions"],
    "Quick, neat handwriting in four weights; notes and arrow labels",
    ["Inter", "Lora"],
  ),
  pick("Permanent Marker", "handwriting", ["accent", "headline"], "Thick marker pen, one weight; scribbled emphasis", [
    "Inter",
    "Oswald",
  ]),
  pick("Pacifico", "handwriting", ["accent", "headline"], "Smooth brush script, one weight; surf, summer, cafes", [
    "Montserrat",
    "Inter",
  ]),
  pick(
    "Kalam",
    "handwriting",
    ["accent", "captions"],
    "Natural pen handwriting in three weights; personal, diary-like",
    ["Inter", "Work Sans"],
  ),
  pick("Rock Salt", "handwriting", ["accent"], "Rough felt-tip scrawl, one weight; grungy, a word at most", [
    "Oswald",
    "Inter",
  ]),
  pick("Dancing Script", "handwriting", ["accent"], "Lively formal script; invitations and soft sign-offs", [
    "Montserrat",
    "Lora",
  ]),
  pick(
    "Gochi Hand",
    "handwriting",
    ["accent", "captions"],
    "Round teenage handwriting, one weight; casual and cheerful",
    ["Nunito", "Inter"],
  ),

  // Mono.
  pick("Space Mono", "mono", ["accent", "numbers"], "Quirky retro-futurist monospace; sci-fi and data labels", [
    "Space Grotesk",
    "Sora",
  ]),
  pick("IBM Plex Mono", "mono", ["numbers", "accent"], "Engineered monospace with italics; technical, corporate", [
    "Inter",
    "Manrope",
  ]),
  pick("DM Mono", "mono", ["numbers", "accent"], "Soft, light monospace; pairs with DM Sans", ["DM Sans", "Manrope"]),
  pick("Fira Code", "mono", ["numbers", "accent"], "Code monospace with ligatures; programming topics", [
    "Inter",
    "Work Sans",
  ]),
  pick("Roboto Mono", "mono", ["numbers", "accent"], "Plain monospace; timers, counters, tables", ["Roboto", "Inter"]),
];
