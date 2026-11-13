// The file's own clock in an export: what the scope's names answer, and when animation-frame callbacks run.
import { createFreeCodeClock } from "../src/web/page/clock";

type Scope = {
  performance: Performance;
  Date: DateConstructor;
  Math: Math;
  requestAnimationFrame(callback: FrameRequestCallback): number;
  cancelAnimationFrame(id: number): void;
};

it("answers performance.now and Date with the frame's time", () => {
  const clock = createFreeCodeClock(1_700_000_000_000);
  const scope = clock.scope as Scope;
  clock.set(2.5);
  expect(scope.performance.now()).toBe(2500);
  expect(scope.Date.now()).toBe(1_700_000_002_500);
  expect(new scope.Date().getTime()).toBe(1_700_000_002_500);
  // A date asked for is that date, and the rest of each object is the real one.
  expect(new scope.Date(5).getTime()).toBe(5);
  expect(scope.performance.timeOrigin).toBe(performance.timeOrigin);
  expect(scope.Math.floor(1.5)).toBe(1);
});

it("runs each animation-frame callback once per flush, with the frame's time", () => {
  const clock = createFreeCodeClock(0);
  const scope = clock.scope as Scope;
  const seen: number[] = [];
  const loop = (ms: number): void => {
    seen.push(ms);
    scope.requestAnimationFrame(loop);
  };
  scope.requestAnimationFrame(loop);
  scope.cancelAnimationFrame(scope.requestAnimationFrame(() => seen.push(-1)));
  expect(clock.flush()).toBe(true);
  clock.set(0.5);
  clock.flush();
  expect(seen).toEqual([0, 500]);
  expect(createFreeCodeClock(0).flush()).toBe(false);
});

it("gives every page the same Math.random sequence", () => {
  const a = (createFreeCodeClock(0).scope as Scope).Math;
  const b = (createFreeCodeClock(0).scope as Scope).Math;
  const first = [a.random(), a.random()];
  expect([b.random(), b.random()]).toEqual(first);
  expect(first[0]).not.toBe(first[1]);
});
