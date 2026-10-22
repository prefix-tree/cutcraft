import { ManualClock, Transport } from "@cut/player";

describe("Transport", () => {
  it("derives time from the clock while playing and holds while paused", () => {
    const clock = new ManualClock();
    const t = new Transport(clock, 10);
    expect(t.time()).toBe(0);
    t.play();
    clock.advance(1.5);
    expect(t.time()).toBe(1.5);
    t.pause();
    clock.advance(5);
    expect(t.time()).toBe(1.5);
  });

  it("scales by rate and re-anchors on rate change", () => {
    const clock = new ManualClock();
    const t = new Transport(clock, 10);
    t.play();
    clock.advance(1);
    t.setRate(2);
    clock.advance(1);
    expect(t.time()).toBe(3);
    expect(t.rate).toBe(2);
    t.setRate(99);
    expect(t.rate).toBe(4);
  });

  it("seeks and clamps", () => {
    const clock = new ManualClock();
    const t = new Transport(clock, 10);
    t.seek(4);
    expect(t.time()).toBe(4);
    t.seek(-1);
    expect(t.time()).toBe(0);
    t.seek(50);
    expect(t.time()).toBe(10);
    t.play();
    expect(t.time()).toBe(0);
  });

  it("ends or loops at the duration", () => {
    const clock = new ManualClock();
    const t = new Transport(clock, 2);
    t.play();
    clock.advance(1);
    expect(t.check()).toBeNull();
    clock.advance(1.5);
    expect(t.check()).toBe("ended");
    expect(t.playing).toBe(false);
    expect(t.time()).toBe(2);

    const l = new Transport(clock, 2);
    l.loop = true;
    l.play();
    clock.advance(2.5);
    expect(l.check()).toBe("looped");
    expect(l.playing).toBe(true);
    expect(l.time()).toBeCloseTo(0.5);
  });

  it("inverts time to clock time", () => {
    const clock = new ManualClock();
    clock.set(100);
    const t = new Transport(clock, 10);
    t.seek(2);
    t.play();
    t.setRate(2);
    expect(t.clockTimeFor(4)).toBe(101);
    expect(t.timeAt(101)).toBe(4);
  });
});
