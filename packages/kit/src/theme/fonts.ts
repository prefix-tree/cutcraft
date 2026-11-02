/**
 * The font families every renderer ships: the export hands them to Satori and
 * the preview loads them from `@cutcraft/player/fonts.css`. All are under the SIL
 * Open Font License, from the `@fontsource` packages named here. Each comes in
 * regular and bold, and italic where the family has one.
 */
export interface BundledFont {
  readonly family: string;
  /** The `@fontsource` package, and the file prefix inside its `files/` directory. */
  readonly id: string;
  readonly italic: boolean;
}

export const BUNDLED_FONTS: readonly BundledFont[] = [
  { family: "Inter", id: "inter", italic: true },
  { family: "Space Grotesk", id: "space-grotesk", italic: false },
  { family: "Playfair Display", id: "playfair-display", italic: true },
  { family: "DM Sans", id: "dm-sans", italic: true },
  { family: "JetBrains Mono", id: "jetbrains-mono", italic: true },
];

export const BUNDLED_FONT_WEIGHTS = [400, 700] as const;

export function isBundledFont(family: string): boolean {
  return BUNDLED_FONTS.some((f) => f.family === family);
}
