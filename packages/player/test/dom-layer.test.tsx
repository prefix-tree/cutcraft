import type { Placement } from "@cutcraft/kit";

import { mountPlayer } from "./helpers/react";
import { fixtureState } from "./helpers/state";

describe("DomLayer", () => {
  it("renders the fixture's overlays at a time with data-el and data-kind", async () => {
    const m = await mountPlayer(fixtureState());
    await m.seek(1.5);
    const q = (sel: string) => m.container.querySelector(sel);
    expect(q('[data-el="t1"][data-kind="title"]')?.textContent).toBe("Why we built it");
    expect(q('[data-el="v1"][data-kind="svg"]')).not.toBeNull();
    expect(q('[data-el="b1"]')?.textContent).toBe("LIVE");
    expect(q('[data-el="s1"]')).toBeNull();
    expect(q('[data-el="composition"][data-kind="composition"]')?.tagName).toBe("CANVAS");
    expect((q("[data-player]") as HTMLElement).dataset.time).toBe("1.5000");
    expect((q("[data-player]") as HTMLElement).dataset.frame).toBe("45");
    await m.unmount();
  });

  it("stacks tracks in document order and shows captions on top", async () => {
    const m = await mountPlayer(fixtureState());
    // cp1 is word:3..word:6.end of the interview, which c1 (in="word:3") plays from 0.
    await m.seek(0.5);
    const overlays = m.container.querySelector('[data-track="overlays"]') as HTMLElement;
    expect(overlays.style.zIndex).toBe("2");
    expect(m.container.querySelector('[data-el="cp1"][data-kind="caption"]')?.textContent).toBe(
      "Hello and welcome back",
    );
    expect(m.container.querySelector('[data-el="cp2"]')).toBeNull();
    await m.seek(2.1);
    expect(m.container.querySelector('[data-el="cp1"]')).toBeNull();
    await m.seek(5.5);
    expect(m.container.querySelector('[data-el="cp2"]')?.textContent).toBe("to the show");
    expect(m.container.querySelector('[data-el="s1"][data-kind="shape"] svg rect')).not.toBeNull();
    expect(m.container.querySelector('[data-el="t1"]')).toBeNull();
    await m.unmount();
  });

  it("applies transforms and transition opacity to DOM elements", async () => {
    const m = await mountPlayer(fixtureState());
    await m.seek(5.5);
    const s1 = m.container.querySelector('[data-el="s1"]') as HTMLElement;
    expect(s1.style.transform).toMatch(/^matrix\(/);
    expect(s1.style.width).toBe("400px");
    await m.unmount();
  });

  it("puts a box behind the caption word being said, and only that one", async () => {
    const state = fixtureState();
    const items = new Map(state.items);
    const cap = items.get("cap") as Placement;
    const cue = items.get("cp2") as Placement;
    items.set("cap", {
      ...cap,
      props: { ...cap.props, animation: "word-highlight", style: { highlight: "#111111", highlightBox: "#4aa3ff" } },
    });
    items.set("cp2", {
      ...cue,
      props: {
        ...cue.props,
        words: [
          { text: "to", start: 4, end: 4.5 },
          { text: "the", start: 4.5, end: 5 },
          { text: "show", start: 5, end: 6 },
        ],
      },
    });
    const m = await mountPlayer({ ...state, items });
    const boxed = () =>
      [...m.container.querySelectorAll<HTMLElement>('[data-el="cp2"] span span')]
        .filter((w) => w.style.background !== "")
        .map((w) => w.textContent);
    await m.seek(4.7);
    expect(boxed()).toEqual(["the"]);
    // The space between words is outside the box, and the line still reads as written.
    expect(m.container.querySelector('[data-el="cp2"]')?.textContent).toBe("to the show");
    await m.seek(5.5);
    expect(boxed()).toEqual(["show"]);
    await m.unmount();
  });
});
