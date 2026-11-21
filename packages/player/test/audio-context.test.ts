// A player that makes its own AudioContext closes it when disposed; one it was given is the caller's to close.
// Browsers cap how many live contexts a page may hold, so a player remounted for every media change would run out.
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { fakeResolver } from "./helpers/fakes";
import { makeState } from "./helpers/state";
import { PlayerCore } from "./internal";

/** An audio node or param that takes any call: the player schedules gains and connects nodes this test doesn't hear. */
const node = (): Record<string, unknown> =>
  new Proxy({ value: 1 } as Record<string, unknown>, {
    get: (target, key) =>
      key in target ? target[key as string] : key === "gain" || key === "pan" ? node() : () => undefined,
  });

/** Just enough of an AudioContext for the player to start and stop; counts what was made and closed. */
class FakeContext {
  static made: FakeContext[] = [];
  closed = 0;
  state = "suspended";
  currentTime = 0;
  sampleRate: number;
  destination = node();
  constructor(options?: { sampleRate?: number }) {
    this.sampleRate = options?.sampleRate ?? 48000;
    FakeContext.made.push(this);
  }
  createGain() {
    return node();
  }
  createBufferSource() {
    return node();
  }
  resume() {
    return Promise.resolve();
  }
  close() {
    this.closed++;
    this.state = "closed";
    return Promise.resolve();
  }
}

const state = makeState({ tracks: [{ id: "main", items: [] }] });
const original = (globalThis as { AudioContext?: unknown }).AudioContext;

beforeEach(() => {
  FakeContext.made = [];
  (globalThis as { AudioContext?: unknown }).AudioContext = FakeContext;
});
afterEach(() => {
  (globalThis as { AudioContext?: unknown }).AudioContext = original;
});

const make = (audioContext?: AudioContext) =>
  new PlayerCore({
    state,
    media: fakeResolver([]),
    raf: () => 0,
    cancelRaf: () => {},
    ...(audioContext ? { audioContext } : {}),
  });

describe("the player's AudioContext", () => {
  it("is closed on dispose when the player made it", () => {
    const player = make();
    expect(FakeContext.made).toHaveLength(1);
    player.dispose();
    player.dispose();
    expect(FakeContext.made[0]?.closed).toBe(1);
  });

  it("is left open when it was passed in", () => {
    const given = new FakeContext();
    const player = make(given as unknown as AudioContext);
    expect(FakeContext.made).toHaveLength(1);
    player.dispose();
    expect(given.closed).toBe(0);
  });

  it("does not pile up over remounts", () => {
    for (let i = 0; i < 10; i++) make().dispose();
    expect(FakeContext.made.filter((c) => c.closed === 0)).toEqual([]);
  });
});
