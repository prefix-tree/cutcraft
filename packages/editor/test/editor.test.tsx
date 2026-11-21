import { act } from "react";
import { createRoot } from "react-dom/client";

import { collectModule, Executor, loadModule, timelineRows } from "@uberscene/sdk";

import {
  FakeAudioOutput,
  FakeAudioSource,
  FakeFrameSource,
  fakeResolver,
  recorderCanvas,
  recorderContext,
} from "../../player/test/helpers/fakes";
import { fixtureState } from "../../player/test/helpers/state";
import { ManualClock, type PlayerOptions } from "../../player/test/internal";
import { Editor, useEdit } from "../src";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const FILE = `import { Composition, Title, Track } from "@uberscene/kit";
export default function Video() {
  return (
    <Composition fps={30} width={640} height={360}>
      <Track id="t" layout="free">
        <Title id="a" start={0} duration={1}>A</Title>
        <Title id="b" start={2} duration={1}>B</Title>
      </Track>
    </Composition>
  );
}
`;

const coreOptions = (): Partial<PlayerOptions> => ({
  clock: new ManualClock(),
  audioOutput: new FakeAudioOutput(),
  toContextTime: (t) => t,
  frameSourceFactory: (id) => new FakeFrameSource(id, 10),
  audioSourceFactory: (id) => new FakeAudioSource(id),
  createCanvas: recorderCanvas,
  raf: () => 0,
  cancelRaf: () => {},
  setInterval: () => 1,
  clearInterval: () => {},
});

async function mount(ui: React.ReactNode) {
  const rec = recorderContext();
  HTMLCanvasElement.prototype.getContext = (() => rec.ctx) as unknown as HTMLCanvasElement["getContext"];
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);
  await act(async () => root.render(ui));
  const $ = <T extends Element = HTMLElement>(sel: string) => container.querySelector<T>(sel);
  const click = (sel: string) => act(async () => $(sel)!.dispatchEvent(new MouseEvent("click", { bubbles: true })));
  const unmount = () => act(async () => root.unmount()).then(() => container.remove());
  return { container, $, click, unmount };
}

describe("Editor", () => {
  it("lists every element from a state, selects from Layers and seeks from the Timeline", async () => {
    const state = fixtureState();
    const m = await mount(
      <Editor.Root state={state} media={fakeResolver(Object.keys(state.manifest.assets))} coreOptions={coreOptions()}>
        <Editor.Preview />
        <Editor.Layers />
        <Editor.Timeline />
      </Editor.Root>,
    );
    const layerIds = [...m.container.querySelectorAll<HTMLElement>("[data-editor-layer]")].map(
      (b) => b.dataset.editorLayer,
    );
    expect(layerIds.length).toBeGreaterThan(0);
    expect(new Set(layerIds).size).toBe(layerIds.length);

    const clip = [...m.container.querySelectorAll<HTMLElement>("[data-editor-clip]")].find(
      (b) => Number.parseFloat(b.style.left) > 0,
    )!;
    const id = clip.dataset.editorClip!;
    await m.click(`[data-editor-layer="${id}"]`);
    expect(m.$(`[data-editor-layer="${id}"]`)!.getAttribute("aria-pressed")).toBe("true");
    expect(clip.getAttribute("aria-pressed")).toBe("true");

    await m.click(`[data-editor-clip="${id}"]`);
    const start = timelineRows(state).elements.find((e) => e.id === id)!.start;
    expect(Number(m.$("[data-player]")!.dataset.time)).toBeCloseTo(start, 3);
    await m.unmount();
  });

  it("edits through the executor, and undo restores", async () => {
    const executor = new Executor({ tree: collectModule(loadModule(FILE) as never), manifest: { assets: {} } });
    function RemoveB() {
      const edit = useEdit();
      return (
        <>
          <button type="button" id="rm" onClick={() => edit.execute({ type: "element/remove", params: { id: "b" } })} />
          <button type="button" id="undo" disabled={!edit.canUndo} onClick={() => edit.undo()} />
        </>
      );
    }
    const m = await mount(
      <Editor.Root executor={executor} media={{}} coreOptions={coreOptions()}>
        <Editor.Layers />
        <RemoveB />
      </Editor.Root>,
    );
    const ids = () =>
      [...m.container.querySelectorAll<HTMLElement>("[data-editor-layer]")].map((b) => b.dataset.editorLayer);
    expect(ids()).toEqual(["a", "b"]);
    expect(m.$<HTMLButtonElement>("#undo")!.disabled).toBe(true);
    await m.click("#rm");
    expect(ids()).toEqual(["a"]);
    await m.click("#undo");
    expect(ids()).toEqual(["a", "b"]);
    await m.unmount();
  });

  it("useEdit throws in a read-only editor", async () => {
    const state = fixtureState();
    function Bad() {
      useEdit();
      return null;
    }
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    await expect(
      mount(
        <Editor.Root state={state} media={{}} coreOptions={coreOptions()}>
          <Bad />
        </Editor.Root>,
      ),
    ).rejects.toThrow(/read-only/);
    spy.mockRestore();
  });
});
