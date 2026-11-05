import { clock, freezeSmil, interpolate } from "../src/overlays/smil";
import { parseSvg, prepareSvg, serialize } from "../src/overlays/svg";

const frozen = (markup: string, t: number, warnings: string[] = []) =>
  serialize(freezeSmil(parseSvg(markup).root!, t, warnings));
const at = (body: string, t: number, warnings: string[] = []) =>
  frozen(`<svg width="100" height="100">${body}</svg>`, t, warnings);

describe("SMIL at a moment", () => {
  it("reads clock values", () => {
    expect([
      clock("2s"),
      clock("500ms"),
      clock("1.5"),
      clock("1min"),
      clock("01:02.5"),
      clock("00:01:02"),
      clock("click"),
    ]).toEqual([2, 0.5, 1.5, 60, 62.5, 62, null]);
  });

  it("interpolates numbers in place, colours as colours, and switches what it cannot", () => {
    expect(interpolate("10", "20", 0.25)).toBe("12.5");
    expect(interpolate("M0 0 L10 10", "M10 0 L20 30", 0.5)).toBe("M5 0 L15 20");
    expect(interpolate("#000000", "#ffffff", 0.5)).toBe("rgb(128, 128, 128)");
    expect(interpolate("red", "blue", 0)).toBe("rgb(255, 0, 0)");
    expect(interpolate("visible", "hidden", 0.6)).toBe("hidden");
  });

  it("animates an attribute from, to, and holds or drops it after", () => {
    const body = (fill: string) =>
      `<circle cx="10" r="5"><animate attributeName="cx" from="10" to="90" begin="1s" dur="2s"${fill}/></circle>`;
    expect(at(body(""), 0.5)).toBe('<svg width="100" height="100"><circle cx="10" r="5"/></svg>');
    expect(at(body(""), 2)).toContain('cx="50"');
    expect(at(body(""), 3.5)).toContain('cx="10"');
    expect(at(body(' fill="freeze"'), 3.5)).toContain('cx="90"');
  });

  it("follows values, keyTimes, discrete steps and splines", () => {
    expect(at('<rect width="10"><animate attributeName="width" values="0;100;50" dur="2s"/></rect>', 0.5)).toContain(
      'width="50"',
    );
    expect(
      at('<rect width="10"><animate attributeName="width" values="0;100;50" keyTimes="0;0.8;1" dur="1s"/></rect>', 0.4),
    ).toContain('width="50"');
    expect(
      at(
        '<rect width="10"><animate attributeName="width" values="0;100;50" calcMode="discrete" dur="3s"/></rect>',
        1.5,
      ),
    ).toContain('width="100"');
    const eased = at(
      '<rect width="10"><animate attributeName="width" values="0;100" calcMode="spline" keySplines="0.42 0 1 1" dur="1s"/></rect>',
      0.5,
    );
    expect(Number(/<rect width="([\d.]+)"/.exec(eased)![1])).toBeCloseTo(31.6, 0);
  });

  it("repeats, accumulates and adds", () => {
    expect(
      at('<rect x="0"><animate attributeName="x" from="0" to="10" dur="1s" repeatCount="indefinite"/></rect>', 7.25),
    ).toContain('x="2.5"');
    expect(
      at(
        '<rect x="0"><animate attributeName="x" from="0" to="10" dur="1s" repeatCount="3" accumulate="sum" fill="freeze"/></rect>',
        10,
      ),
    ).toContain('x="30"');
    expect(at('<rect x="5"><animate attributeName="x" by="10" dur="1s" fill="freeze"/></rect>', 2)).toContain('x="15"');
  });

  it("turns, scales and moves with animateTransform, replacing or adding", () => {
    expect(
      at(
        '<g transform="translate(5 5)"><animateTransform attributeName="transform" type="rotate" from="0 50 50" to="360 50 50" dur="4s"/></g>',
        1,
      ),
    ).toContain('transform="rotate(90 50 50)"');
    expect(
      at(
        '<g transform="translate(5 5)"><animateTransform attributeName="transform" type="scale" from="1" to="2" dur="1s" additive="sum" fill="freeze"/></g>',
        2,
      ),
    ).toContain('transform="translate(5 5) scale(2)"');
  });

  it("sets, chains on other animations, and targets by href", () => {
    expect(
      at('<rect visibility="hidden"><set attributeName="visibility" to="visible" begin="1s"/></rect>', 2),
    ).toContain('visibility="visible"');
    const chain =
      '<rect x="0"><animate id="a" attributeName="x" from="0" to="10" dur="1s" fill="freeze"/><animate attributeName="x" from="10" to="20" begin="a.end+1s" dur="1s" fill="freeze"/></rect>';
    expect(at(chain, 1.5)).toContain('x="10"');
    expect(at(chain, 2.5)).toContain('x="15"');
    expect(at('<rect id="r" x="0"/><animate href="#r" attributeName="x" from="0" to="10" dur="1s"/>', 0.5)).toContain(
      '<rect id="r" x="5"/>',
    );
  });

  it("animates over an inline style, and leaves out what it cannot play", () => {
    expect(
      at(
        '<rect style="fill: red; stroke: blue"><animate attributeName="fill" from="#000000" to="#ffffff" dur="2s"/></rect>',
        1,
      ),
    ).toContain('style=" stroke: blue" fill="rgb(128, 128, 128)"');
    const warnings: string[] = [];
    const out = at(
      '<rect x="0"><animate attributeName="x" to="10" begin="click" dur="1s"/><animateMotion path="M0 0 L10 10" dur="1s"/></rect>',
      0.5,
      warnings,
    );
    expect(out).toBe('<svg width="100" height="100"><rect x="0"/></svg>');
    expect(warnings).toEqual([
      'SMIL begin "click" waits for an event or a script; that animation is left out',
      "<animateMotion> is not played; the element stays where it is",
    ]);
  });

  it("is applied by prepareSvg at the time it is given, and CSS animations are removed", () => {
    const svg =
      '<svg width="10" height="10"><style>@keyframes spin { from { opacity: 0 } to { opacity: 1 } } rect { animation: spin 1s infinite; fill: red }</style><rect width="10" height="10"><animate attributeName="opacity" from="0" to="1" dur="1s"/></rect></svg>';
    const p = prepareSvg(svg, { box: { width: 10, height: 10 }, time: 0.25 });
    expect(p.animated).toBe(true);
    expect(p.markup).toContain('opacity="0.25"');
    expect(p.markup).not.toContain("<animate");
    expect(p.markup).not.toMatch(/keyframes|animation/);
    expect(p.markup).toContain("fill: red");
    expect(p.warnings).toEqual([
      "CSS animations are not played; the SVG is drawn without them (use SMIL <animate>, which is)",
    ]);
    expect(
      prepareSvg('<svg width="10" height="10"><rect width="10" height="10"/></svg>', { box: { width: 10, height: 10 } })
        .animated,
    ).toBe(false);
  });
});
