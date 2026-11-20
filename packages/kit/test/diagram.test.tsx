import { isValidElement, type ReactElement, type ReactNode } from "react";

import { Cells, CountUp, DrawnLine, grid, Label, type LayerClock, progress } from "@uberscene/kit";
import { installLayerClock } from "@uberscene/kit/schema";

/** The layer's clock, set by hand: seconds of the video, and seconds since the layer started. */
let now = { time: 0, elapsed: 0 };
beforeAll(() => installLayerClock((): LayerClock => ({ t: 0, remaining: 0, duration: 10, fps: 30, ...now })));
afterAll(() => installLayerClock(null));

/** What a part draws, as SVG markup: the parts are plain functions of their props and the layer's clock. */
function markup(node: ReactNode): string {
  if (Array.isArray(node)) return node.map(markup).join("");
  if (node === null || node === undefined || typeof node === "boolean") return "";
  if (!isValidElement(node)) return String(node);
  const { children, ...props } = node.props as Record<string, unknown> & { children?: ReactNode };
  if (typeof node.type === "function") return markup((node.type as (p: unknown) => ReactNode)(node.props));
  const attrs = Object.entries(props)
    .filter(([, v]) => v !== undefined && v !== null)
    .map(([k, v]) => ` ${k.startsWith("data-") ? k : k.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`)}="${String(v)}"`)
    .join("");
  return `<${String(node.type)}${attrs}>${markup(children)}</${String(node.type)}>`;
}

/** The markup of a part at a moment. */
function draw(part: ReactElement, time = 0, elapsed = time): string {
  now = { time, elapsed };
  return markup(part);
}
const attr = (markup: string, name: string): string | undefined => new RegExp(` ${name}="([^"]*)"`).exec(markup)?.[1];

describe("progress", () => {
  const clock = (time: number, elapsed = time) => ({ time, elapsed });

  it("is 0 before it starts, 1 once it is over, and eased between", () => {
    expect(progress(clock(1.9), { at: 2, over: 1 })).toBe(0);
    expect(progress(clock(3), { at: 2, over: 1 })).toBe(1);
    expect(progress(clock(2.5), { at: 2, over: 1, easing: "linear" })).toBe(0.5);
    // Eased in and out by default: slower than a straight line at the start.
    expect(progress(clock(2.25), { at: 2, over: 1 })).toBeLessThan(0.25);
    expect(progress(clock(2.5), { at: 2, over: 1 })).toBeCloseTo(0.5, 2);
  });

  it("counts `at` in the video's seconds and `after` from the layer's start", () => {
    // 12 s into the video, 2 s into the layer.
    expect(progress(clock(12, 2), { at: 11, over: 2, easing: "linear" })).toBe(0.5);
    expect(progress(clock(12, 2), { after: 1, over: 2, easing: "linear" })).toBe(0.5);
    // With neither, it starts with the layer; 0.4 s unless `over` says.
    expect(progress(clock(12, 0.2), { easing: "linear" })).toBe(0.5);
  });

  it("happens at once with no time to take, and takes a progress as given", () => {
    expect([progress(clock(1.99), { at: 2, over: 0 }), progress(clock(2), { at: 2, over: 0 })]).toEqual([0, 1]);
    expect([progress(clock(0), { progress: 0.3 }), progress(clock(0), { progress: 4 })]).toEqual([0.3, 1]);
  });
});

describe("DrawnLine", () => {
  const line = (
    <DrawnLine from={[10, 20]} to={[110, 220]} at={1} over={2} easing="linear" strokeWidth={4} stroke="#fff" />
  );

  it("draws nothing before it starts, then from its first point towards its second", () => {
    expect(draw(line, 0.5)).toBe("");
    const half = draw(line, 2);
    expect([attr(half, "x1"), attr(half, "y1"), attr(half, "x2"), attr(half, "y2")]).toEqual(["10", "20", "60", "120"]);
    const done = draw(line, 9);
    expect([attr(done, "x2"), attr(done, "y2")]).toEqual(["110", "220"]);
  });

  it("is a line: its own props pass through, and none of the timing ones", () => {
    const markup = draw(line, 9);
    expect([attr(markup, "stroke"), attr(markup, "stroke-width")]).toEqual(["#fff", "4"]);
    expect(markup).not.toMatch(/ (at|over|easing|from|to)=/);
  });
});

describe("Label", () => {
  it("fades the word in at its place, named for the layout check", () => {
    const part = <Label text="LAMP" x={400} y={300} fontSize={40} fill="#fff" at={2} over={1} easing="linear" />;
    expect(attr(draw(part, 2.5), "opacity")).toBe("0.5");
    const shown = draw(part, 4);
    expect(attr(shown, "data-name")).toBe("lamp");
    expect(shown).toContain(">LAMP</text>");
    expect(shown).toContain('text-anchor="middle"');
    // No point to name, no line.
    expect(shown).not.toContain("<line");
    expect(attr(draw(<Label text="No Shadow" x={0} y={0} />, 1), "data-name")).toBe("no-shadow");
    expect(attr(draw(<Label text="x" x={0} y={0} name="mark" />, 1), "data-name")).toBe("mark");
  });

  it("starts its line beside the word, on the side that faces the point, and ends it at the point", () => {
    // A four letter word, 40 px: about 99 px wide and 40 high, centred on (400, 300).
    const to = (point: [number, number]) => draw(<Label text="LAMP" x={400} y={300} fontSize={40} to={point} />, 9);
    const start = (markup: string) => [Number(attr(markup, "x1")), Number(attr(markup, "y1"))];
    const end = (markup: string) => [Number(attr(markup, "x2")), Number(attr(markup, "y2"))];
    // A point to the left: from the word's left edge, at its middle height, clear of the letters.
    const left = to([200, 320]);
    expect(start(left)[0]).toBeLessThan(400 - 49);
    expect(start(left)[1]).toBe(300);
    expect(end(left)).toEqual([200, 320]);
    // A point below: from under the word.
    const below = to([420, 600]);
    expect(start(below)).toEqual([400, 300 + 20 + 10]);
    // To the right and above, likewise.
    expect(start(to([900, 300]))[0]).toBeGreaterThan(400 + 49);
    expect(start(to([400, 0]))).toEqual([400, 300 - 20 - 10]);
  });

  it("takes the side, the gap and the word's width when the guesses are not wanted", () => {
    const markup = draw(
      <Label text="LAMP" x={400} y={300} fontSize={40} to={[200, 320]} side="top" gap={4} textWidth={120} />,
      9,
    );
    expect([attr(markup, "x1"), attr(markup, "y1")]).toEqual(["400", "276"]);
    const right = draw(<Label text="LAMP" x={400} y={300} to={[900, 300]} textWidth={120} gap={4} />, 9);
    expect(attr(right, "x1")).toBe("464");
  });
});

describe("CountUp", () => {
  it("counts from one number to another, rounded, or as its format says", () => {
    const degrees = (
      <CountUp to={5} x={10} y={20} at={1} over={2} easing="linear" format={(v) => `${Math.round(v)}°`} />
    );
    expect(draw(degrees, 0)).toContain(">0°</text>");
    expect(draw(degrees, 2.2)).toContain(">3°</text>");
    expect(draw(degrees, 5)).toContain(">5°</text>");
    expect(draw(<CountUp from={60} to={1} progress={0.5} />)).toContain(">31</text>");
    const markup = draw(degrees, 5);
    expect([attr(markup, "x"), attr(markup, "y")]).toEqual(["10", "20"]);
  });
});

describe("Cells", () => {
  const rects = (markup: string) => [...markup.matchAll(/<rect ([^>]*)>/g)].map((m) => ` ${m[1]}`);

  it("lays a row of cells out from its corner, with a gap between", () => {
    const row = rects(draw(<Cells count={3} x={100} y={50} size={40} gap={10} fill="#333" />));
    expect(row.map((r) => [attr(r, "x"), attr(r, "y"), attr(r, "width"), attr(r, "height"), attr(r, "fill")])).toEqual([
      ["100", "50", "40", "40", "#333"],
      ["150", "50", "40", "40", "#333"],
      ["200", "50", "40", "40", "#333"],
    ]);
  });

  it("lights the first so many, or the ones a function names", () => {
    const fills = (part: ReactElement) => rects(draw(part)).map((r) => attr(r, "fill"));
    expect(fills(<Cells count={4} x={0} y={0} size={10} fill="#333" litFill="#f80" lit={2} />)).toEqual([
      "#f80",
      "#f80",
      "#333",
      "#333",
    ]);
    expect(
      fills(
        <Cells count={4} x={0} y={0} size={10} fill={(i) => `#${i}${i}${i}`} litFill="#f80" lit={(i) => i === 3} />,
      ),
    ).toEqual(["#000", "#111", "#222", "#f80"]);
  });

  it("writes a value under each cell, and rings the one asked for", () => {
    const markup = draw(
      <Cells
        values={[78, 92, 96]}
        x={100}
        y={50}
        size={40}
        gap={10}
        highlight={1}
        highlightStroke="#fff"
        valueProps={{ fontSize: 20 }}
        name="dots"
      />,
    );
    expect(attr(markup, "data-name")).toBe("dots");
    expect([...markup.matchAll(/<text ([^>]*)>(\d+)<\/text>/g)].map((m) => [attr(` ${m[1]}`, "x"), m[2]])).toEqual([
      ["120", "78"],
      ["170", "92"],
      ["220", "96"],
    ]);
    // Three cells and the ring round the second, a little larger than it.
    const ring = rects(markup)[3] as string;
    expect([attr(ring, "x"), attr(ring, "width"), attr(ring, "fill"), attr(ring, "stroke")]).toEqual([
      "145",
      "50",
      "none",
      "#fff",
    ]);
  });
});

describe("grid", () => {
  it("gives every cell its place and its box, along the rows", () => {
    const board = grid({ columns: 4, rows: 3, width: 400, height: 150 });
    expect(board.cell).toEqual({ width: 100, height: 50 });
    expect(board.cells).toHaveLength(12);
    expect(board.cells[0]).toEqual({ index: 0, column: 0, row: 0, left: 0, top: 0, width: 100, height: 50 });
    expect(board.cells[5]).toEqual({ index: 5, column: 1, row: 1, left: 100, top: 50, width: 100, height: 50 });
    expect(board.cells[11]).toMatchObject({ column: 3, row: 2, left: 300, top: 100 });
  });

  it("starts where it is told, and a rect is the same box as the cell", () => {
    const board = grid({ columns: 8, rows: 15, width: 1080, height: 2025, y: -52.5 });
    expect(board.rect(0, 0)).toEqual({ left: 0, top: -52.5, width: 135, height: 135 });
    const { index: _index, column: _column, row: _row, ...box } = board.cells[9] as (typeof board.cells)[number];
    expect(board.rect(1, 1)).toEqual(box);
    // A place off the grid is where that cell would be, for something that leaves the board.
    expect(board.rect(-1, 15)).toEqual({ left: -135, top: 1972.5, width: 135, height: 135 });
  });

  it("refuses a grid with no cells", () => {
    expect(() => grid({ columns: 0, rows: 3, width: 10, height: 10 })).toThrow("whole numbers of columns and rows");
    expect(() => grid({ columns: 2.5, rows: 3, width: 10, height: 10 })).toThrow("whole numbers");
  });
});
