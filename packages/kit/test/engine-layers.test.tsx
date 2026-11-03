import {
  Composition,
  Executor,
  Motion,
  Three,
  Track,
  collect,
  collectModule,
  installLayerEngine,
  layerEngine,
  resolve,
} from "@cutcraft/kit";
import { buildSourceIndex, foldToSource, lint, loadModule } from "@cutcraft/kit/source";

const manifest = { assets: {} };

const text = `import { Composition, Motion, Three, Track } from "@cutcraft/kit";

export const manifest = { assets: {} };

export default function Video() {
  return (
    <Composition fps={30} width={640} height={360}>
      <Track id="fx" layout="free">
        <Three id="cube" start={1} duration={3} camera={{ position: [0, 0, 5], fov: 40 }} background="#101010" setup={({ scene }) => { scene.name = "s"; return ({ time }) => time; }} />
        <Motion id="headline" start={0} duration={2} sequence={[["h1", { opacity: [0, 1] }, { duration: 0.6 }]]}>
          <h1>Launch</h1>
        </Motion>
      </Track>
    </Composition>
  );
}
`;

describe("<Three> and <Motion>", () => {
  it("are Layers to the resolver, with their engine and their own props", () => {
    const state = resolve(collectModule(loadModule(text) as never), manifest);
    expect(state.errors).toEqual([]);
    const cube = state.items.get("cube")!;
    expect(cube.kind).toBe("layer");
    expect(cube.start).toBe(1);
    expect(cube.props).toMatchObject({
      engine: "three",
      camera: { position: [0, 0, 5], fov: 40 },
      background: "#101010",
    });
    expect(typeof cube.props.setup).toBe("function");
    expect(cube.interior).toBeUndefined();
    expect(state.items.get("headline")!.props).toMatchObject({
      engine: "motion",
      sequence: [["h1", { opacity: [0, 1] }, { duration: 0.6 }]],
    });
  });

  it("check their props against their own schema", () => {
    const bad = (
      <Composition fps={30} width={640} height={360}>
        <Track id="fx" layout="free">
          <Three id="cube" start={0} duration={2} camera={{ fov: 500 }} />
          <Motion id="m" start={0} duration={2} {...({ wobble: 1 } as object)} />
        </Track>
      </Composition>
    );
    const errors = resolve(collect(bad), manifest).errors.map((e) => `${e.id}:${e.prop ?? ""}`);
    expect(errors).toEqual(["cube:camera.fov", "m:"]);
  });

  it("are found in the source as Layers, and an edit folds back onto the tag", () => {
    const index = buildSourceIndex(text);
    expect(index.elements.get("cube")).toMatchObject({ kind: "layer", name: "Three" });
    expect(index.elements.get("cube")!.lockedProps).toContain("setup");
    expect(index.elements.get("headline")!.interior).toBeUndefined();
    const exec = new Executor({
      tree: collectModule(loadModule(text) as never, {}, { index }),
      manifest,
      now: () => 0,
    });
    expect(exec.execute({ type: "clip/move", params: { id: "cube", place: { start: 2.5 } } }).ok).toBe(true);
    const folded = foldToSource(text, exec.log(), exec.state());
    expect(folded.skipped).toEqual([]);
    expect(folded.text).toContain('<Three id="cube" start={2.5} duration={3}');
    expect(folded.text).toContain("setup={({ scene }) =>");
  });

  it("lint cleanly", () => {
    expect(lint(text).filter((d) => d.severity === "error")).toEqual([]);
  });

  it("are drawn by installed engines", () => {
    const engine = () => null;
    installLayerEngine("three", engine);
    expect(layerEngine("three")).toBe(engine);
    installLayerEngine("three", null);
    expect(layerEngine("three")).toBeNull();
  });
});
