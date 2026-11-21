import { renderToStaticMarkup } from "react-dom/server";

import type { Placement, ResolvedState } from "@uberscene/sdk";

import { blendOf } from "../src/model/frame-plan";
import { titleContent } from "../src/overlays/content";

function title(text: string, type: string): string {
  const placement = {
    id: "t",
    kind: "title",
    start: 0,
    duration: 2,
    props: { width: 400, size: 60, align: "left", animation: { type, in: 0.6, out: 0 } },
  } as unknown as Placement;
  return renderToStaticMarkup(titleContent({ placement, children: [], state: {} as ResolvedState, time: 1, text }));
}

describe("a word-by-word title", () => {
  it("is one flex item holding its words and the spaces between them, so it wraps like plain text", () => {
    const html = title("One two three", "wordByWord");
    const box = new DOMParser().parseFromString(html, "text/html").body.firstElementChild as HTMLElement;
    expect(box.style.display).toBe("flex");
    // A flex box makes each child an item on one line that does not wrap; the words must sit inside a single child.
    expect(box.children).toHaveLength(1);
    const inner = box.firstElementChild as HTMLElement;
    expect(inner.tagName).toBe("SPAN");
    expect(inner.textContent).toBe("One two three");
    expect([...inner.children].map((c) => c.textContent)).toEqual(["One", " ", "two", " ", "three"]);
  });

  it("leaves a plain title's text as the box's only content", () => {
    const html = title("One two three", "none");
    const box = new DOMParser().parseFromString(html, "text/html").body.firstElementChild as HTMLElement;
    expect(box.children).toHaveLength(0);
    expect(box.textContent).toBe("One two three");
  });
});

describe("the camelCase values (0.6)", () => {
  const styled = (style: Record<string, unknown>, animation?: Record<string, unknown>) => {
    const placement = {
      id: "t",
      kind: "title",
      start: 0,
      duration: 2,
      props: { style, ...(animation ? { animation } : {}) },
    } as unknown as Placement;
    const html = renderToStaticMarkup(
      titleContent({ placement, children: [], state: {} as ResolvedState, time: 0.25, text: "Hi" }),
    );
    return new DOMParser().parseFromString(html, "text/html").body.firstElementChild as HTMLElement;
  };

  it("draws lineThrough as CSS line-through, and a stroke by its thickness", () => {
    const box = styled({ decoration: "lineThrough", stroke: { color: "#000000", thickness: 3 } });
    expect(box.style.textDecoration).toBe("line-through");
    expect(box.getAttribute("style")).toContain("-webkit-text-stroke:3px #000000");
  });

  it("slides a slideUp title in from below", () => {
    expect(styled({}, { type: "slideUp", in: 0.5, out: 0 }).style.transform).toBe("translate(0px, 20px)");
  });
});

describe("the blend modes (0.6)", () => {
  it("draw the camelCase names with the canvas operations they drew as kebab-case", () => {
    expect(
      ["colorDodge", "colorBurn", "hardLight", "softLight", "linearDodge", "multiply"].map((b) => blendOf(b)),
    ).toEqual(["color-dodge", "color-burn", "hard-light", "soft-light", "lighter", "multiply"]);
    expect(blendOf("soft-light")).toBe("source-over");
  });
});
