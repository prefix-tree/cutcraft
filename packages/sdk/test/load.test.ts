import { describe, expect, it } from "vitest";

import { collectModule, gatherLocalFiles, loadModule, resolve } from "@uberscene/sdk";

import { fixtureText, manifest } from "./helpers";

describe("loadModule", () => {
  it("runs a cut file from its source, as the collector and resolver see an imported one", () => {
    const state = resolve(collectModule(loadModule(fixtureText) as never), manifest);
    expect(state.items.size).toBeGreaterThan(0);
  });

  it("refuses an import the host does not offer", () => {
    const source = `import { helper } from "left-pad";\nexport default function V() { return helper(); }`;
    expect(() => loadModule(source)).toThrow("which this host does not offer");
  });

  it("gives the file's code the host's scope in place of the globals of those names", () => {
    const source = "export default function V() { return performance.now(); }";
    expect(loadModule(source, { scope: { performance: { now: () => 1234 } } }).default({})).toBe(1234);
    expect(loadModule(source).default({})).not.toBe(1234);
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

describe("the file's own modules", () => {
  const video = `import { Badge } from "./blocks/badge";
import { label } from "./lib/text.ts";
export default function V() { return Badge({ text: label("hi") }); }`;
  const files: Record<string, string> = {
    "blocks/badge.tsx": `import { shout } from "../lib/text";
export function Badge({ text }: { text: string }) { return <b>{shout(text)}</b>; }`,
    "lib/text.ts": `import { z } from "zod";
export const label = (s: string): string => z.string().parse(s);
export const shout = (s: string): string => s.toUpperCase();`,
  };

  it("gathers every module the file imports, and the ones they import, by path from the file's folder", () => {
    const read: string[] = [];
    const gathered = gatherLocalFiles(video, (p) => {
      read.push(p);
      return files[p];
    });
    expect(gathered).toEqual(files);
    // Each path is read once: the file's own import of lib/text.ts finds it already gathered.
    expect(read).toEqual(["blocks/badge.tsx", "lib/text.tsx", "lib/text.ts"]);
  });

  it("runs them, once each, with the host's imports", () => {
    const element = loadModule(video, { files }).default({}) as { type: string; props: { children: string } };
    expect(element.type).toBe("b");
    expect(element.props.children).toBe("HI");
  });

  it("finds an index module and a module imported twice, and lets two modules import each other", () => {
    const mod = loadModule(
      `import { a } from "./parts"; import { b } from "./parts/b"; export default function V() { return a() + b(); }`,
      {
        files: {
          "parts/index.ts": `import { b } from "./b"; export const a = () => "a" + b(); export const tag = "A";`,
          "parts/b.ts": `import * as p from "./index"; export const b = () => "b"; export const late = () => p.tag;`,
        },
      },
    );
    expect(mod.default({})).toBe("abb");
  });

  it("says which file imports a module that is not there", () => {
    expect(() => gatherLocalFiles(video, (p) => (p === "blocks/badge.tsx" ? files[p] : undefined))).toThrow(
      'blocks/badge.tsx imports "../lib/text", which is not there (looked for lib/text.tsx, lib/text.ts, lib/text/index.tsx, lib/text/index.ts)',
    );
    expect(() => loadModule(video)).toThrow(/The file imports “.\/blocks\/badge”, which the host did not pass/);
  });

  it("takes only .ts and .tsx modules", () => {
    expect(() => gatherLocalFiles(`import data from "./data.json"; export default () => data;`, () => "{}")).toThrow(
      'the file imports "./data.json": a video\'s own modules are .ts or .tsx files',
    );
  });

  it("passes a refusal from the host through, such as a path outside the project", () => {
    expect(() =>
      gatherLocalFiles(`import { x } from "../../secret"; export default () => x;`, (p) => {
        throw new Error(`${p} is outside the project`);
      }),
    ).toThrow("../../secret.tsx is outside the project");
  });

  it("leaves a name the host offers to the host, even one that looks like a path", () => {
    const source = `import { n } from "./lengths"; export default function V() { return n; }`;
    expect(gatherLocalFiles(source, () => undefined, { imports: { "./lengths": {} } })).toEqual({});
    expect(loadModule(source, { imports: { "./lengths": { n: 2 } } }).default({})).toBe(2);
  });
});
