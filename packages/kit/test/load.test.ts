import { describe, expect, it } from "vitest";
import { collectModule, resolve } from "@cutcut/kit";
import { loadModule } from "@cutcut/kit/source";
import { fixtureText, manifest } from "./helpers";

describe("loadModule", () => {
  it("runs a cut file from its source, as the collector and resolver see an imported one", () => {
    const state = resolve(collectModule(loadModule(fixtureText) as never), manifest);
    expect(state.items.size).toBeGreaterThan(0);
  });

  it("refuses an import outside react, zod and the kit", () => {
    const source = `import { helper } from "../lib/helper";\nexport default function V() { return helper(); }`;
    expect(() => loadModule(source)).toThrow("which a cut file may not");
  });

  it("requires a default export", () => {
    expect(() => loadModule(`export const x = 1;`)).toThrow("no default export");
  });
});
