import { GOOGLE_FACES } from "./font-faces.generated";
import { BUNDLED_PICKS, type FontCategory, type FontPick, type FontRole, GOOGLE_PICKS } from "./font-picks";
import { BUNDLED_FONT_WEIGHTS, BUNDLED_FONTS } from "./fonts";

export type { FontCategory, FontRole } from "./font-picks";

/** One family to choose from: what it is, which faces it has, what it is for. */
export interface CatalogFont extends FontPick {
  /** `bundled`: both renderers ship it, use it by name. `google`: declare it with `googleFont()`. */
  readonly source: "bundled" | "google";
  /** The upright weights it has. */
  readonly weights: readonly number[];
  /** The weights it has in italic; empty when it has no italic. */
  readonly italics: readonly number[];
}

/**
 * The fonts to choose from: the five bundled families and a short list from Google Fonts, each with its category, the
 * roles it suits, a line on how it looks and the families it pairs with. What an agent reads (`uberscene fonts`) and what
 * an editor's font picker lists. Any other Google family still works with `googleFont()`; it is only not described here.
 */
export const FONT_CATALOG: readonly CatalogFont[] = Object.freeze([
  ...BUNDLED_PICKS.map((p): CatalogFont => {
    const italic = BUNDLED_FONTS.find((f) => f.family === p.family)?.italic ?? false;
    return { ...p, source: "bundled", weights: BUNDLED_FONT_WEIGHTS, italics: italic ? BUNDLED_FONT_WEIGHTS : [] };
  }),
  ...GOOGLE_PICKS.map((p): CatalogFont => {
    const faces = GOOGLE_FACES[p.family] ?? { weights: [], italics: [] };
    return { ...p, source: "google", weights: faces.weights, italics: faces.italics };
  }),
]);

const BY_FAMILY = new Map(FONT_CATALOG.map((f) => [f.family.toLowerCase(), f]));

/** The catalogue's entry for a family, whatever its letter case; undefined for a family the catalogue does not list. */
export function findFont(family: string): CatalogFont | undefined {
  return BY_FAMILY.get(family.trim().toLowerCase());
}

/** The catalogue, narrowed to a role, a category, or both. */
export function fontsFor(filter: { readonly role?: FontRole; readonly category?: FontCategory } = {}): CatalogFont[] {
  return FONT_CATALOG.filter(
    (f) => (!filter.role || f.roles.includes(filter.role)) && (!filter.category || f.category === filter.category),
  );
}

/** The listed family whose name is nearest a misspelt one, when one is near enough to be what was meant. */
export function nearestFont(family: string): CatalogFont | undefined {
  const wanted = family.trim().toLowerCase();
  let best: CatalogFont | undefined;
  let bestDistance = Math.max(2, Math.floor(wanted.length / 4)) + 1;
  for (const font of FONT_CATALOG) {
    const d = distance(wanted, font.family.toLowerCase(), bestDistance);
    if (d < bestDistance) {
      best = font;
      bestDistance = d;
    }
  }
  return best;
}

/** Edit distance between two strings, given up on (as `limit`) once it must reach `limit`. */
function distance(a: string, b: string, limit: number): number {
  if (Math.abs(a.length - b.length) >= limit) return limit;
  let row = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    const next = [i];
    for (let j = 1; j <= b.length; j++)
      next[j] = Math.min(
        (row[j] as number) + 1,
        (next[j - 1] as number) + 1,
        (row[j - 1] as number) + (a[i - 1] === b[j - 1] ? 0 : 1),
      );
    row = next;
  }
  return Math.min(row[b.length] as number, limit);
}
