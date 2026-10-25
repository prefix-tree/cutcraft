// @vitest-environment node
import { pathLength, shapeLength } from "../src/overlays/svg-length";

describe("stroke lengths", () => {
  it("measures straight paths, relative and absolute, with implicit lines and closing", () => {
    expect(pathLength("M0 0 L3 4")).toBeCloseTo(5);
    expect(pathLength("M0 0 3 4 6 8")).toBeCloseTo(10);
    expect(pathLength("m1 1 h10 v10 h-10 z")).toBeCloseTo(40);
    expect(pathLength("M0 0H10V10H0Z M20 20 l0 5")).toBeCloseTo(45);
  });

  it("measures curves and arcs close to their true length", () => {
    // A quarter circle of radius 10 as an arc, and as the usual cubic approximation.
    expect(pathLength("M10 0 A10 10 0 0 1 0 10")).toBeCloseTo((Math.PI * 10) / 2, 1);
    expect(pathLength("M10 0 C10 5.523 5.523 10 0 10")).toBeCloseTo((Math.PI * 10) / 2, 1);
    expect(pathLength("M0 0 Q5 0 10 0")).toBeCloseTo(10);
    expect(pathLength("M0 0 C0 0 10 0 10 0 S20 0 20 0")).toBeCloseTo(20);
    // A full circle as two half arcs.
    expect(pathLength("M0 10 a10 10 0 1 0 20 0 a10 10 0 1 0 -20 0")).toBeCloseTo(2 * Math.PI * 10, 0);
  });

  it("measures the basic shapes", () => {
    expect(shapeLength("rect", { width: "10", height: "20" })).toBeCloseTo(60);
    expect(shapeLength("circle", { r: "5" })).toBeCloseTo(Math.PI * 10);
    expect(shapeLength("ellipse", { rx: "5", ry: "5" })).toBeCloseTo(Math.PI * 10);
    expect(shapeLength("line", { x1: "0", y1: "0", x2: "6", y2: "8" })).toBeCloseTo(10);
    expect(shapeLength("polygon", { points: "0,0 10,0 10,10" })).toBeCloseTo(20 + Math.SQRT2 * 10);
    expect(shapeLength("polyline", { points: "0 0 10 0 10 10" })).toBeCloseTo(20);
    expect(shapeLength("rect", { width: "10", height: "10", rx: "5" })).toBeCloseTo(Math.PI * 10);
    expect(shapeLength("g", {})).toBeNull();
  });
});
