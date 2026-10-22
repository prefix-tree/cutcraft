import { useT } from "@cut/kit";
import { fixtureElement, fixtureState } from "./helpers/state";
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
});
