// Title and captions presets are a look: each field is one of the element's `style` fields. Kept out of the theme's
// public exports; the theme schema reports the other fields and `resolveTheme` leaves them out.
import { CAPTIONS_LOOK_KEYS, captionsSchema } from "../jsx/schemas/captions";
import { TITLE_LOOK_KEYS, titleSchema } from "../jsx/schemas/overlays";

/** Kinds whose presets are a look: each field is one of the element's `style` fields. */
const LOOK_PRESETS: Readonly<Record<string, { keys: readonly string[]; props: readonly string[]; plural: string }>> = {
  title: { keys: TITLE_LOOK_KEYS, props: Object.keys(titleSchema.shape), plural: "titles" },
  captions: { keys: CAPTIONS_LOOK_KEYS, props: Object.keys(captionsSchema.shape), plural: "captions" },
};

/**
 * The fields of a title or captions preset that are not part of how text looks (a box width, a transform, an entrance), each
 * with what to say. A theme that holds one is reported where it is declared; the field never reaches the elements.
 */
export function placementKeys(
  kind: string,
  preset: Readonly<Record<string, unknown>>,
): { key: string; message: string }[] {
  const look = LOOK_PRESETS[kind];
  if (!look) return [];
  return Object.keys(preset)
    .filter((key) => !look.keys.includes(key))
    .map((key) => {
      const where = key === "width" || key === "height" ? `box.${key}` : look.props.includes(key) ? key : null;
      return {
        key,
        message:
          `holds "${key}", which is not how text looks: a ${kind} preset holds only ${look.keys.join(", ")}` +
          (where && key !== "style" ? `; write ${where} on the ${look.plural} that use it` : ""),
      };
    });
}

/** The theme with every title and captions preset cut to its look, or the input when nothing was cut. */
export function lookOnlyPresets(raw: object): object {
  const styles = (raw as { styles?: unknown }).styles;
  if (!isRecord(styles)) return raw;
  let changed = false;
  const out: Record<string, unknown> = { ...styles };
  for (const kind of Object.keys(LOOK_PRESETS)) {
    const presets = styles[kind];
    if (!isRecord(presets)) continue;
    const cut: Record<string, unknown> = {};
    for (const [name, preset] of Object.entries(presets)) {
      if (!isRecord(preset) || placementKeys(kind, preset).length === 0) {
        cut[name] = preset;
        continue;
      }
      changed = true;
      cut[name] = Object.fromEntries(Object.entries(preset).filter(([k]) => LOOK_PRESETS[kind]?.keys.includes(k)));
    }
    out[kind] = cut;
  }
  return changed ? { ...raw, styles: out } : raw;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
