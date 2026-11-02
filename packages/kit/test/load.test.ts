import { describe, expect, it } from "vitest";
import { collectModule, resolve } from "@cutcraft/kit";
import { loadModule } from "@cutcraft/kit/source";
import { fixtureText, manifest } from "./helpers";

describe("loadModule", () => {
  it("runs a cut file from its source, as the collector and resolver see an imported one", () => {
    const state = resolve(collectModule(loadModule(fixtureText) as never), manifest);
    expect(state.items.size).toBeGreaterThan(0);
  });

  it("refuses an import the host does not offer", () => {
    const source = `import { helper } from "../lib/helper";\nexport default function V() { return helper(); }`;
    expect(() => loadModule(source)).toThrow("which this host does not offer");
  });

  it("offers the modules the host passes, for free code in a Layer", () => {
    const source = `import { wave } from "shader-lib";\nexport default function V() { return wave; }`;
    const mod = loadModule(source, { imports: { "shader-lib": { wave: "sin" } } });
    expect(mod.default({})).toBe("sin");
  });

  it("requires a default export", () => {
    expect(() => loadModule(`export const x = 1;`)).toThrow("no default export");
  });
});
