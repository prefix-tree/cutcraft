import { renderToStaticMarkup } from "react-dom/server";

import type { Placement, ResolvedState } from "@uberscene/sdk";

import { titleContent } from "../src/overlays/content";

function title(text: string, preset: string): string {
  const placement = {
    id: "t",
    kind: "title",
    start: 0,
    duration: 2,
    props: { width: 400, size: 60, align: "left", animation: { preset, in: 0.6, out: 0 } },
  } as unknown as Placement;
  return renderToStaticMarkup(titleContent({ placement, children: [], state: {} as ResolvedState, time: 1, text }));
}

describe("a word-by-word title", () => {
  it("is one flex item holding its words and the spaces between them, so it wraps like plain text", () => {
    const html = title("One two three", "word-by-word");
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
