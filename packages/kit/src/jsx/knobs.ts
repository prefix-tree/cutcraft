import { type ZodType, z } from "zod";

/** What control a knob wants: read from the zod type, or from a kit helper that marks it. */
export type KnobKind = "text" | "number" | "boolean" | "choice" | "color" | "font" | "image" | "other";

/** One value of a file's `schema`, as an editor or an agent needs it to offer a control. */
export interface Knob {
  readonly key: string;
  /** What it means, from `.describe("…")`. An editor uses it as the label. */
  readonly description?: string;
  readonly kind: KnobKind;
  /** May be left out of `defaults`. */
  readonly optional: boolean;
  /** The values a `choice` takes, in order. */
  readonly options?: readonly (string | number)[];
  /** A number's bounds, from `.min()` and `.max()`. */
  readonly min?: number;
  readonly max?: number;
  /** Its value now: from the values given, else the schema's `.default()`. */
  readonly value?: unknown;
}

/** The meta key the helpers below set. Plain JSON Schema has no word for a colour or a font. */
const KIND = "cutcraftKind";

/**
 * Schema helpers for values that are strings to zod but want their own control: a colour picker, a font menu, an
 * asset or image picker. Use them in a file's `schema` like any zod type, with `.describe()` for the label:
 *
 * ```ts
 * export const schema = z.object({
 *   accent: knob.color().describe("Colour of the numbers"),
 *   heading: knob.font().describe("Font of the headline"),
 *   logo: knob.image().describe("Logo on the closing card"),
 * });
 * ```
 *
 * A colour is any CSS colour or a theme token (`$primary`). A font is a family the file can use: bundled, or declared
 * with `font()` or `googleFont()`. An image is an asset reference (`asset:logo`) or a URL. A choice is `z.enum([…])`.
 */
export const knob = {
  color: () => z.string().meta({ [KIND]: "color" }),
  font: () => z.string().meta({ [KIND]: "font" }),
  image: () => z.string().meta({ [KIND]: "image" }),
};

interface JsonField {
  readonly type?: string | readonly string[];
  readonly enum?: readonly (string | number)[];
  readonly description?: string;
  readonly minimum?: number;
  readonly maximum?: number;
  readonly default?: unknown;
  readonly anyOf?: readonly JsonField[];
  readonly [KIND]?: KnobKind;
}

/**
 * The knobs of a file's `schema`, in the order it lists them, with the value each has in `values` (the file's
 * `defaults` merged with any props given). A schema that is not an object has none.
 */
export function knobsOf(schema: ZodType | undefined, values: Readonly<Record<string, unknown>> = {}): Knob[] {
  if (!schema) return [];
  const json = z.toJSONSchema(schema, { io: "input", unrepresentable: "any" }) as {
    properties?: Record<string, JsonField>;
    required?: readonly string[];
  };
  const required = new Set(json.required ?? []);
  return Object.entries(json.properties ?? {}).map(([key, field]) => {
    // `.nullable()` and unions come out as anyOf: the first branch that is not null says what the control is.
    const branch = field.anyOf?.find((b) => b.type !== "null") ?? field;
    const value = key in values ? values[key] : (field.default ?? branch.default);
    const description = field.description ?? branch.description;
    const min = branch.minimum;
    const max = branch.maximum;
    return {
      key,
      ...(description ? { description } : {}),
      kind: kindOf({ ...branch, [KIND]: field[KIND] ?? branch[KIND] }),
      optional: !required.has(key),
      ...(branch.enum ? { options: branch.enum } : {}),
      ...(min !== undefined ? { min } : {}),
      ...(max !== undefined ? { max } : {}),
      ...(value !== undefined ? { value } : {}),
    };
  });
}

function kindOf(field: JsonField): KnobKind {
  if (field[KIND]) return field[KIND];
  if (field.enum) return "choice";
  const type = Array.isArray(field.type) ? field.type.find((t) => t !== "null") : field.type;
  if (type === "string") return "text";
  if (type === "number" || type === "integer") return "number";
  if (type === "boolean") return "boolean";
  return "other";
}
