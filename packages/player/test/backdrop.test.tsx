import { backdropTracks, buildFramePlan } from "@cutcraft/player";

import { mountPlayer } from "./helpers/react";
import { makeState } from "./helpers/state";

const under = {
  id: "under",
  layout: "free" as const,
  items: [
    {
      id: "bg",
      kind: "graphic",
      start: 0,
      duration: 4,
      props: { kind: "gradient-background", from: "#000000", to: "#ffffff", type: "linear", angle: 135 },
    },
  ],
};
const main = { id: "main", items: [{ id: "c1", kind: "clip", source: { in: 0, out: 4, asset: "a" } }] };
const over = {
  id: "over",
  layout: "free" as const,
  items: [{ id: "t1", kind: "title", start: 0, duration: 4, props: { text: "Hi" } }],
};

describe("overlays beneath the footage", () => {
  it("are the overlay tracks below every visible footage track", () => {
    expect([...backdropTracks(makeState({ tracks: [under, main, over] }))]).toEqual(["under"]);
    expect([...backdropTracks(makeState({ tracks: [main, under, over] }))]).toEqual([]);
    expect([...backdropTracks(makeState({ tracks: [under, over] }))]).toEqual([]);
    expect([...backdropTracks(makeState({ tracks: [under, { ...main, hidden: true }, over] }))]).toEqual([]);
  });

  it("leave the canvas a transparent ground only when there are some", () => {
    expect(buildFramePlan(makeState({ tracks: [under, main, over] }), 1).clear).toBe(true);
    expect(buildFramePlan(makeState({ tracks: [main, under, over] }), 1).clear).toBeUndefined();
  });

  it("are mounted under the canvas, on the composition's background", async () => {
    const m = await mountPlayer(makeState({ tracks: [under, main, over] }));
    await m.seek(1);
    const root = m.container.querySelector("[data-player]") as HTMLElement;
    const order = [...root.children].map((c) =>
      (c as HTMLElement).dataset.ground !== undefined
        ? "ground"
        : (c as HTMLElement).dataset.domLayer === "backdrop"
          ? "backdrop"
          : c.tagName === "CANVAS"
            ? "canvas"
            : (c as HTMLElement).dataset.domLayer === ""
              ? "front"
              : c.tagName,
    );
    expect(order.slice(0, 4)).toEqual(["ground", "backdrop", "canvas", "front"]);
    expect(root.querySelector('[data-dom-layer="backdrop"] [data-el="bg"]')).not.toBeNull();
    expect(root.querySelector('[data-dom-layer=""] [data-el="t1"]')).not.toBeNull();
    expect(root.querySelector('[data-dom-layer=""] [data-el="bg"]')).toBeNull();
    await m.unmount();
  });
});
