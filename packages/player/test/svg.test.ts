// @vitest-environment node
import { parseSvg, prepareSvg, svgIntrinsicSize } from "../src/overlays/svg";

const box = { width: 100, height: 50 };

describe("prepareSvg", () => {
  it("sizes the root to the box, keeping the drawing's own coordinates", () => {
    const out = prepareSvg('<svg width="20" height="10"><rect width="20" height="10"/></svg>', { box }).markup;
    expect(out).toBe(
      '<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="100" height="50" viewBox="0 0 20 10" preserveAspectRatio="xMidYMid meet"><rect width="20" height="10"/></svg>',
    );
  });

  it("takes the element's viewBox and preserveAspectRatio over the file's", () => {
    const out = prepareSvg('<svg viewBox="0 0 10 10" preserveAspectRatio="none"><circle r="5"/></svg>', {
      box,
      viewBox: { minX: -5, minY: -5, width: 10, height: 10 },
      preserveAspectRatio: "xMinYMin slice",
    }).markup;
    expect(out).toContain('viewBox="-5 -5 10 10"');
    expect(out).toContain('preserveAspectRatio="xMinYMin slice"');
  });

  it("removes what runs code or reaches outside the file, and says so", () => {
    const { markup, warnings } = prepareSvg(
      '<svg viewBox="0 0 10 10" onload="x()"><script>alert(1)</script><foreignObject><div/></foreignObject>' +
        '<a href="https://example.com"><rect onclick="y()" width="5" height="5"/></a>' +
        '<image href="https://example.com/a.png"/><image href="data:image/png;base64,AAAA"/>' +
        "<style>@import url(https://x.css); rect { fill: url(https://x/p.svg#g) }</style></svg>",
      { box },
    );
    expect(markup).not.toMatch(/script|foreignObject|onload|onclick|example\.com|@import/);
    expect(markup).toContain('<g><rect width="5" height="5"/></g>');
    expect(markup).toContain('href="data:image/png;base64,AAAA"');
    expect(markup).toContain("fill: none");
    expect(warnings.length).toBeGreaterThanOrEqual(3);
  });

  it("renames ids and every reference to them, so two copies on one page do not collide", () => {
    const src =
      '<svg viewBox="0 0 10 10"><defs><linearGradient id="g"/><clipPath id="c"/></defs><style>#g { color: #fff } .a{fill:#000}</style>' +
      '<rect id="r" fill="url(#g)" clip-path="url(#c)"/><use href="#r"/><use xlink:href="#r"/></svg>';
    const out = prepareSvg(src, { box, idPrefix: "logo 1" }).markup;
    expect(out).toContain('id="logo_1-g"');
    expect(out).toContain('fill="url(#logo_1-g)"');
    expect(out).toContain('clip-path="url(#logo_1-c)"');
    expect(out).toContain('<use href="#logo_1-r"/>');
    expect(out).toContain('<use xlink:href="#logo_1-r"/>');
    expect(out).toContain("#logo_1-g { color: #fff }");
    expect(out).toContain(".a{fill:#000}");
  });

  it("puts theme tokens in attributes and styles, never in text", () => {
    const { markup, warnings } = prepareSvg(
      '<svg viewBox="0 0 10 10"><rect fill="$primary" stroke="var(--cc-accent)"/><circle style="fill: var(--cc-missing, #123456)"/><path fill="$nope"/><text>$5 off</text></svg>',
      { box, tokens: { primary: "#ff5a1f", accent: "#00ff00" } },
    );
    expect(markup).toContain('<rect fill="#ff5a1f" stroke="#00ff00"/>');
    expect(markup).toContain('style="fill: #123456"');
    expect(markup).toContain('<path fill="$nope"/>');
    expect(markup).toContain("<text>$5 off</text>");
    expect(warnings).toEqual(['unknown token "nope" is left as written']);
  });

  it("paints every drawn pixel in the colour for replace, and keeps the shading for tint", () => {
    const replace = prepareSvg('<svg viewBox="0 0 10 10"><rect width="10" height="10"/></svg>', {
      box,
      color: { mode: "replace", tint: "#ff0000" },
      idPrefix: "s",
    }).markup;
    expect(replace).toContain('<filter id="s-cc-color"');
    expect(replace).toContain('<feFlood flood-color="#ff0000" result="flood"/>');
    expect(replace).toContain('<g filter="url(#s-cc-color)"><rect width="10" height="10"/></g>');
    const tint = prepareSvg('<svg viewBox="0 0 10 10"><rect width="10" height="10"/></svg>', {
      box,
      color: { mode: "tint", tint: "#ff0000", opacity: 0.5 },
    }).markup;
    expect(tint).toContain('values="0.213 0.715 0.072 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 1 0"');
    expect(tint).toContain('operator="arithmetic" k1="0" k2="0.5" k3="0.5" k4="0"');
    expect(
      prepareSvg('<svg viewBox="0 0 1 1"/>', { box, color: { mode: "none", tint: "#ff0000" } }).markup,
    ).not.toContain("filter");
  });

  it("escapes what it writes back", () => {
    const out = prepareSvg(
      '<svg viewBox="0 0 1 1"><text title="a &quot;b&quot; &amp; c">1 &lt; 2 &amp; 3</text><style><![CDATA[a > b {}]]></style></svg>',
      { box },
    ).markup;
    expect(out).toContain('title="a &quot;b&quot; &amp; c">1 &lt; 2 &amp; 3</text>');
    expect(out).toContain("<style>a &gt; b {}</style>");
  });

  it("draws nothing and explains when the markup is not SVG", () => {
    expect(prepareSvg("<svg><rect></svg>", { box })).toMatchObject({
      markup: "",
      warnings: [expect.stringMatching(/could not be read/)],
    });
    expect(prepareSvg("<div/>", { box })).toMatchObject({
      markup: "",
      warnings: ["the markup is not an <svg> element"],
    });
  });

  it("returns the same result for the same input without doing the work again", () => {
    const m = '<svg viewBox="0 0 3 3"><rect width="1" height="1"/></svg>';
    expect(prepareSvg(m, { box })).toBe(prepareSvg(m, { box }));
    expect(parseSvg(m)).toBe(parseSvg(m));
  });
});

describe("svgIntrinsicSize", () => {
  it("reads width and height, then the viewBox, then falls back to 300 by 150", () => {
    expect(svgIntrinsicSize('<svg width="40px" height="20"/>')).toEqual({ width: 40, height: 20 });
    expect(svgIntrinsicSize('<svg viewBox="0 0 64 32"/>')).toEqual({ width: 64, height: 32 });
    expect(svgIntrinsicSize('<svg width="128" viewBox="0 0 64 32"/>')).toEqual({ width: 128, height: 64 });
    expect(svgIntrinsicSize('<svg width="100%" height="100%"/>')).toEqual({ width: 300, height: 150 });
    expect(svgIntrinsicSize("<svg/>", { minX: 0, minY: 0, width: 10, height: 5 })).toEqual({ width: 10, height: 5 });
  });
});
