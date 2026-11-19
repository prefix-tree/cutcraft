import { z } from "zod";

import { knob, knobsOf } from "@uberscene/kit";
import { loadModule } from "@uberscene/kit/source";

describe("knobsOf", () => {
  it("reads each value's description, kind, options and bounds, in the schema's order", () => {
    const schema = z.object({
      title: z.string().describe("Episode title"),
      accent: knob.color().describe("Colour of the numbers"),
      heading: knob.font().describe("Font of the headline"),
      logo: knob.image().optional(),
      look: z.enum(["dark", "light"]).describe("The look"),
      count: z.number().int().min(1).max(12).describe("How many cards"),
      loud: z.boolean(),
      extra: z.object({ a: z.number() }),
    });
    expect(knobsOf(schema, { title: "Hi", accent: "#ff5a1f", count: 3 })).toEqual([
      { key: "title", description: "Episode title", kind: "text", optional: false, value: "Hi" },
      { key: "accent", description: "Colour of the numbers", kind: "color", optional: false, value: "#ff5a1f" },
      { key: "heading", description: "Font of the headline", kind: "font", optional: false },
      { key: "logo", kind: "image", optional: true },
      { key: "look", description: "The look", kind: "choice", optional: false, options: ["dark", "light"] },
      { key: "count", description: "How many cards", kind: "number", optional: false, min: 1, max: 12, value: 3 },
      { key: "loud", kind: "boolean", optional: false },
      { key: "extra", kind: "other", optional: false },
    ]);
  });

  it("keeps the kind whichever order .describe() and the helper come in", () => {
    const schema = z.object({ a: knob.color().describe("A"), b: knob.font().describe("B").default("Inter") });
    expect(knobsOf(schema).map((k) => [k.kind, k.description, k.value])).toEqual([
      ["color", "A", undefined],
      ["font", "B", "Inter"],
    ]);
  });

  it("reads through .nullable() and .default()", () => {
    const schema = z.object({ note: z.string().nullable().describe("A note"), size: z.number().default(48) });
    expect(knobsOf(schema)).toEqual([
      { key: "note", description: "A note", kind: "text", optional: false },
      { key: "size", kind: "number", optional: true, value: 48 },
    ]);
  });

  it("has none without a schema", () => {
    expect(knobsOf(undefined)).toEqual([]);
  });

  it("reads the knobs of a loaded file, which writes them with the kit's helpers", () => {
    const mod = loadModule(`
      import { z } from "zod";
      import { Composition, knob } from "@uberscene/kit";
      export const schema = z.object({ accent: knob.color().describe("Accent") });
      export const defaults = { accent: "$primary" };
      export default function Video() { return <Composition fps={30} width={640} height={360} />; }
    `);
    expect(knobsOf(mod.schema, mod.defaults)).toEqual([
      { key: "accent", description: "Accent", kind: "color", optional: false, value: "$primary" },
    ]);
  });
});
