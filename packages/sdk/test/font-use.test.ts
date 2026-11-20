import { describe, expect, it } from "vitest";

import { collectModule, Executor, foldToSource, lint, loadModule, resolve } from "@uberscene/sdk";

const FILE = `import { Caption, Captions, Composition, googleFont, Title, Track } from "@uberscene/kit";

const oswald = googleFont("Oswald", { weights: [400] });

export default function Video() {
  return (
    <Composition fps={30} width={640} height={360} theme={{ extends: "midnight" }}>
      <Track id="t" layout="free">
        <Title id="h" start={0} duration={1} font={oswald}>Hi</Title>
        <Title id="sub" start={0} duration={1} weight={700}>There</Title>
      </Track>
      <Captions id="caps" style={{ size: 40 }}>
        <Caption id="c1" start={0} end={1} text="hello" />
      </Captions>
      <Captions id="preset" style="boxed">
        <Caption id="c2" start={0} end={1} text="hello" />
      </Captions>
    </Composition>
  );
}
`;
const PLAIN = `import { Composition, Title, Track } from "@uberscene/kit";
const bebasNeue = 1;
export default function Video() {
  return (
    <Composition fps={30} width={640} height={360}>
      <Track id="t" layout="free">
        <Title id="h" start={0} duration={1}>Hi</Title>
      </Track>
    </Composition>
  );
}
`;
const open = (text: string) =>
  new Executor({ tree: collectModule(loadModule(text) as never), manifest: { assets: {} } });
const folded = (text: string, exec: Executor) => foldToSource(text, exec.log(), exec.state()).text;
const reload = (text: string) => resolve(collectModule(loadModule(text) as never), { assets: {} });
const faces = (state: { fonts: readonly { family: string; weight: number }[] }) =>
  state.fonts.map((f) => `${f.family} ${f.weight}`);

describe("font/use", () => {
  it("sets a catalogue family on a title, loads it for the preview at once, and declares it on fold", () => {
    const exec = open(FILE);
    expect(exec.execute({ type: "font/use", params: { id: "sub", family: "Bebas Neue" } }).ok).toBe(true);
    expect(exec.state().items.get("sub")?.props.font).toBe("Bebas Neue");
    // The title is bold, Bebas Neue has one weight: that one is loaded.
    expect(faces(exec.state())).toEqual(["Oswald 400", "Bebas Neue 400"]);
    const text = folded(FILE, exec);
    expect(text).toContain('const bebasNeue = googleFont("Bebas Neue");');
    expect(text).toContain("font={bebasNeue}");
    expect(text).not.toContain("$fonts");
    const again = reload(text);
    expect(again.errors.map((e) => e.message)).toEqual([]);
    expect(faces(again)).toEqual(["Oswald 400", "Bebas Neue 400"]);
    expect(lint(text).filter((d) => d.rule === "font-available" || d.rule === "declaration")).toEqual([]);
  });

  it("adds a weight to a declaration the file already has", () => {
    const exec = open(FILE);
    expect(exec.execute({ type: "font/use", params: { id: "sub", family: "Oswald", weight: 700 } }).ok).toBe(true);
    expect(faces(exec.state())).toEqual(["Oswald 400", "Oswald 700"]);
    const text = folded(FILE, exec);
    expect(text).toContain('const oswald = googleFont("Oswald", { weights: [400, 700] });');
    expect(text).toContain('<Title id="sub" start={0} duration={1} weight={700} font={oswald}>');
    expect(faces(reload(text))).toEqual(["Oswald 400", "Oswald 700"]);
  });

  it("sets a theme role and the captions' font, each by the identifier it declares", () => {
    const exec = open(FILE);
    expect(exec.execute({ type: "font/use", params: { role: "heading", family: "Anton" } }).ok).toBe(true);
    expect(exec.execute({ type: "font/use", params: { id: "caps", family: "Montserrat", weight: 800 } }).ok).toBe(true);
    expect(exec.state().theme.fonts.heading).toBe("Anton");
    const text = folded(FILE, exec);
    expect(text).toContain('const anton = googleFont("Anton");');
    expect(text).toContain('const montserrat = googleFont("Montserrat", { weights: [800] });');
    expect(text).toContain("fonts: { heading: anton }");
    expect(text).toContain("style={{ size: 40, font: montserrat, weight: 800 }}");
    const again = reload(text);
    expect(again.errors.map((e) => e.message)).toEqual([]);
    expect(faces(again).sort()).toEqual(["Anton 400", "Montserrat 800", "Oswald 400"]);
  });

  it("uses a bundled family by name, with nothing to declare", () => {
    const exec = open(FILE);
    expect(exec.execute({ type: "font/use", params: { id: "sub", family: "Playfair Display" } }).ok).toBe(true);
    const text = folded(FILE, exec);
    expect(text).toContain('font="Playfair Display"');
    expect(text.match(/googleFont\(/g)).toHaveLength(1);
  });

  it("imports googleFont when the file does not, and picks a name the file has not taken", () => {
    const exec = open(PLAIN);
    expect(exec.execute({ type: "font/use", params: { id: "h", family: "Bebas Neue" } }).ok).toBe(true);
    const text = folded(PLAIN, exec);
    expect(text).toContain('import { Composition, Title, Track, googleFont } from "@uberscene/kit";');
    expect(text).toContain('const bebasNeueFont = googleFont("Bebas Neue");');
    expect(text).toContain("font={bebasNeueFont}");
    expect(reload(text).errors).toEqual([]);
  });

  it("undoes in one step, leaving nothing to load or declare", () => {
    const exec = open(FILE);
    exec.execute({ type: "font/use", params: { id: "sub", family: "Bebas Neue" } });
    exec.undo();
    expect(exec.state().items.get("sub")?.props.font).not.toBe("Bebas Neue");
    expect(faces(exec.state())).toEqual(["Oswald 400"]);
    expect(folded(FILE, exec)).toBe(FILE);
    exec.redo();
    expect(faces(exec.state())).toEqual(["Oswald 400", "Bebas Neue 400"]);
  });

  it("refuses a family it cannot load, a weight the family lacks, and a target that takes no font", () => {
    const exec = open(FILE);
    const errors = (params: Record<string, unknown>) => {
      const result = exec.execute({ type: "font/use", params: params as never });
      return (result.errors ?? []).map((e) => e.message);
    };
    expect(errors({ id: "sub", family: "Monserrat" })).toEqual([expect.stringContaining('did you mean "Montserrat"?')]);
    expect(errors({ id: "sub", family: "Bebas Neue", weight: 700 })).toEqual([
      '"Bebas Neue" has no weight 700; it has 400',
    ]);
    expect(errors({ id: "t", family: "Inter" })).toEqual([expect.stringContaining("takes no font")]);
    expect(errors({ id: "preset", family: "Inter" })).toEqual([expect.stringContaining("theme preset")]);
    expect(errors({ family: "Inter" })).toEqual([expect.stringContaining("one of them")]);
    expect(errors({ id: "sub", role: "heading", family: "Inter" })).toEqual([expect.stringContaining("one of them")]);
  });

  it("declares a catalogue family any other action sets as a font", () => {
    const exec = open(PLAIN);
    expect(exec.execute({ type: "text/update", params: { id: "h", props: { font: "Anton" } } }).ok).toBe(true);
    const text = folded(PLAIN, exec);
    expect(text).toContain('const anton = googleFont("Anton");');
    expect(text).toContain("font={anton}");
  });
});
