// @vitest-environment jsdom
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";

import { installLayerClock, type LayerClock, layerFramesPending, type Seekable, useSeekable } from "@cutcraft/kit";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

let elapsed = 0;
beforeAll(() =>
  installLayerClock(
    (): LayerClock => ({ t: elapsed / 10, elapsed, remaining: 10 - elapsed, duration: 10, time: elapsed, fps: 30 }),
  ),
);
afterAll(() => installLayerClock(null));

/** A stand-in for a library's timeline: records what it was asked, and what it was built on. */
class FakeTimeline implements Seekable {
  readonly seeks: number[] = [];
  reverted = false;
  constructor(readonly scope: Element) {}
  seek(seconds: number): void {
    this.seeks.push(seconds);
    (this.scope as HTMLElement).dataset.at = String(seconds);
  }
  revert(): void {
    this.reverted = true;
  }
}

let root: Root, host: HTMLDivElement;
beforeEach(() => {
  host = document.createElement("div");
  root = createRoot(host);
});
afterEach(() => act(() => root.unmount()));

/** Renders `node` at a layer time, as the player does on each frame. */
function frame(node: React.ReactNode, at: number): void {
  elapsed = at;
  act(() => root.render(node));
}

describe("useSeekable", () => {
  it("builds once on its element, seeks to the layer's time on every frame, and reverts on unmount", () => {
    const built: FakeTimeline[] = [];
    function Scene() {
      const ref = useSeekable((el) => {
        const tl = new FakeTimeline(el);
        built.push(tl);
        return tl;
      });
      return <div ref={ref} id="scope" />;
    }
    frame(<Scene />, 0);
    frame(<Scene />, 1.5);
    frame(<Scene />, 0.5);
    expect(built).toHaveLength(1);
    expect(built[0]!.scope.id).toBe("scope");
    expect(built[0]!.seeks).toEqual([0, 1.5, 0.5]);
    expect(host.querySelector<HTMLElement>("#scope")!.dataset.at).toBe("0.5");
    act(() => root.unmount());
    expect(built[0]!.reverted).toBe(true);
    root = createRoot(host);
  });

  it("rebuilds when its deps change, and reverts the one it replaces", () => {
    const built: FakeTimeline[] = [];
    function Scene({ to }: { readonly to: number }) {
      const ref = useSeekable(
        (el) => {
          const tl = new FakeTimeline(el);
          built.push(tl);
          return tl;
        },
        [to],
      );
      return <div ref={ref} />;
    }
    frame(<Scene to={1} />, 1);
    frame(<Scene to={1} />, 2);
    frame(<Scene to={2} />, 2);
    expect(built).toHaveLength(2);
    expect(built[0]!.reverted).toBe(true);
    expect(built[1]!.seeks).toEqual([2]);
  });

  it("falls back to destroy, then kill, to clean up", () => {
    const calls: string[] = [];
    function Scene({ kind }: { readonly kind: "destroy" | "kill" }) {
      const ref = useSeekable(
        () =>
          kind === "destroy"
            ? { seek() {}, destroy: () => calls.push("destroy") }
            : { seek() {}, kill: () => calls.push("kill") },
        [kind],
      );
      return <div ref={ref} />;
    }
    frame(<Scene kind="destroy" />, 0);
    frame(<Scene kind="kill" />, 0);
    act(() => root.unmount());
    expect(calls).toEqual(["destroy", "kill"]);
    root = createRoot(host);
  });

  it("holds the frame while an asynchronous seek is under way", async () => {
    let finish = (): void => {};
    function Scene() {
      const ref = useSeekable(() => ({
        seek: () =>
          new Promise<void>((resolve) => {
            finish = resolve;
          }),
      }));
      return <div ref={ref} />;
    }
    const before = layerFramesPending();
    frame(<Scene />, 1);
    expect(layerFramesPending()).toBe(before + 1);
    finish();
    await act(async () => {});
    expect(layerFramesPending()).toBe(before);
  });

  it("says where the ref goes when it is not on an element", () => {
    function Scene() {
      useSeekable(() => ({ seek() {} }));
      return null;
    }
    const error = console.error;
    console.error = () => {};
    try {
      expect(() => frame(<Scene />, 0)).toThrow(/put the ref it returns on an element/);
    } finally {
      console.error = error;
    }
  });
});
