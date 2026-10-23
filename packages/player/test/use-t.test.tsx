import { Composition, Executor, Layer, Track, collectModule, useLayer, useT } from "@cutcut/kit";
import * as sample from "../../kit/fixtures/sample";
import { fixtureElement, fixtureManifest, fixtureState, makeState } from "./helpers/state";
import { mountPlayer } from "./helpers/react";

describe("useT", () => {
  it("throws without a Player", () => {
    expect(() => useT()).toThrow(/needs a Player/);
  });

  it("drives Layer interiors from 0 to 1 over the layer", async () => {
    const m = await mountPlayer(fixtureState(), fixtureElement());
    await m.seek(5);
    const text = () => m.container.querySelector('[data-el="l1"][data-kind="layer"]')?.textContent;
    expect(text()).toBe("0");
    await m.seek(7);
    expect(text()).toBe("600");
    await m.seek(8.99);
    expect(text()).toBe("1197");
    await m.seek(9.5);
    expect(m.container.querySelector('[data-el="l1"]')).toBeNull();
    await m.unmount();
    expect(() => useT()).toThrow(/needs a Player/);
  });

  it("renders nothing inside a Layer without the element", async () => {
    const m = await mountPlayer(fixtureState());
    await m.seek(6);
    expect(m.container.querySelector('[data-el="l1"]')?.textContent).toBe("");
    await m.unmount();
  });

  it("useLayer gives the clock in seconds, clamped to the layer", async () => {
    const state = makeState({ tracks: [{ id: "main", layout: "free", items: [{ id: "l1", kind: "layer", start: 5, duration: 3 }] }] });
    function Countdown() {
      const { remaining, elapsed, duration, time } = useLayer();
      return <span>{`${Math.ceil(remaining)}/${elapsed.toFixed(1)}/${duration}/${time}`}</span>;
    }
    const element = (
      <Composition fps={30} width={640} height={360}>
        <Track id="main" layout="free"><Layer id="l1" start={5} duration={3}><Countdown /></Layer></Track>
      </Composition>
    );
    const m = await mountPlayer(state, element);
    const text = () => m.container.querySelector('[data-el="l1"]')?.textContent;
    await m.seek(5);
    expect(text()).toBe("3/0.0/3/5");
    await m.seek(6.5);
    expect(text()).toBe("2/1.5/3/6.5");
    await m.seek(7.9);
    expect(text()).toBe("1/2.9/3/7.9");
    await m.unmount();
    expect(() => useLayer()).toThrow(/needs a Player/);
  });

  it("applies edited handles to the interior without re-evaluating the file", async () => {
    const exec = new Executor({ tree: collectModule(sample), manifest: fixtureManifest, now: () => 0 });
    expect(exec.execute({ type: "layer/setProps", params: { id: "l1", props: { to: 600 } } }).ok).toBe(true);
    const m = await mountPlayer(exec.state(), fixtureElement());
    const text = () => m.container.querySelector('[data-el="l1"][data-kind="layer"]')?.textContent;
    await m.seek(7);
    expect(text()).toBe("300");
    await m.unmount();
  });
});
