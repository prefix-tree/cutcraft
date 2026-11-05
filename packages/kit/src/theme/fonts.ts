/**
 * The font families the player ships: the preview and the export load them
 * from `@cutcraft/player/fonts.css`. All are under the SIL
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

export type FontStyle = "normal" | "italic";

/** Where a declared face's file comes from. */
export type FontSource =
  /** A file found the way an asset is: `<id>.ttf` (`.otf`, `.woff`, `.woff2`) in the media folder, or the player's `media`. */
  | { readonly kind: "asset"; readonly id: string }
  /** Google Fonts: the export downloads it once into a local cache; the player loads it from Google. */
  | { readonly kind: "google" };

/** One face a file declares with `font()` or `googleFont()`. */
export interface DeclaredFont {
  readonly family: string;
  readonly weight: number;
  readonly style: FontStyle;
  readonly source: FontSource;
}

interface FontStore {
  /** Faces declared while a file loads through `loadModule`, or null outside one. */
  scope: Map<string, DeclaredFont> | null;
  /** Faces declared by modules imported some other way (a bundled app), for `collectModule` to fall back on. */
  readonly global: Map<string, DeclaredFont>;
}

// On globalThis, so a second copy of the kit in one page or process still shares it.
const STORE_KEY = Symbol.for("cutcraft.fonts.store");
const store: FontStore = ((globalThis as Record<symbol, FontStore | undefined>)[STORE_KEY] ??= {
  scope: null,
  global: new Map(),
});

/** The faces a module loaded by `loadModule` declared, stored on its exports under this key. */
export const MODULE_FONTS = Symbol.for("cutcraft.fonts");

function declare(face: DeclaredFont): string {
  if (!(Number.isInteger(face.weight) && face.weight >= 100 && face.weight <= 900 && face.weight % 100 === 0))
    throw new Error(`font "${face.family}": weight must be 100, 200 … 900, got ${face.weight}`);
  if (face.style !== "normal" && face.style !== "italic")
    throw new Error(`font "${face.family}": style must be "normal" or "italic", got "${face.style}"`);
  (store.scope ?? store.global).set(`${face.family}|${face.weight}|${face.style}`, face);
  return face.family;
}

/**
 * Declares a face from a font file and returns its family, to pass as a `font` prop, a theme font or a CSS
 * `fontFamily`. Call it at the top of the file with literal arguments, as the editor and lint read them from the source.
 *
 *   const brand = font({ family: "Brand Sans", src: "asset:brand", weight: 700 });
 *   <Title id="hello" font={brand}>Hello</Title>
 *
 * `src: "asset:brand"` finds `brand.ttf` (or `.otf`, `.woff`, `.woff2`) where the export finds media, and asks the
 * player's `media` for `brand`.
 */
export function font(options: {
  readonly family: string;
  readonly src: string;
  readonly weight?: number;
  readonly style?: FontStyle;
}): string {
  if (!options.src.startsWith("asset:") || options.src.length === "asset:".length)
    throw new Error(`font "${options.family}": src must be "asset:<id>", got "${options.src}"`);
  return declare({
    family: options.family,
    weight: options.weight ?? 400,
    style: options.style ?? "normal",
    source: { kind: "asset", id: options.src.slice("asset:".length) },
  });
}

/**
 * Declares a Google Fonts family, in each weight and style given (default 400, normal), and returns the family. The
 * export downloads the files once into `~/.cache/cutcraft/fonts` (`CUTCRAFT_FONT_CACHE` moves it) and reads them from
 * there; the player loads them from Google.
 *
 *   const titan = googleFont("Titan One");
 *   const inter = googleFont("Inter Tight", { weights: [400, 700], styles: ["normal", "italic"] });
 */
export function googleFont(
  family: string,
  options: { readonly weights?: readonly number[]; readonly styles?: readonly FontStyle[] } = {},
): string {
  for (const weight of options.weights ?? [400])
    for (const style of options.styles ?? ["normal"]) declare({ family, weight, style, source: { kind: "google" } });
  return family;
}

/** Runs `load` and returns the faces declared while it ran: how `loadModule` keeps each file's faces apart. */
export function collectFonts(load: () => void): DeclaredFont[] {
  const outer = store.scope;
  const scope = new Map<string, DeclaredFont>();
  store.scope = scope;
  try {
    load();
  } finally {
    store.scope = outer;
  }
  return [...scope.values()];
}

/** The faces a module declared: those `loadModule` recorded for it, or else every face declared outside a load. */
export function fontsOf(mod: object): readonly DeclaredFont[] {
  return (mod as Record<symbol, readonly DeclaredFont[] | undefined>)[MODULE_FONTS] ?? [...store.global.values()];
}
