import { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, describe, expect, it } from "vitest";

import { captureWarnings } from "@cutcraft/player";

import { htmlInCanvas } from "../src/react/html-in-canvas";
import { ShaderBox } from "../src/react/ShaderBox";

const pass = { name: "swap", sources: ["vec4 effect(vec2 uv) { return texture(image, uv); }"], params: {}, time: 0 };

describe("ShaderBox", () => {
  afterEach(() => captureWarnings(null));

  it("shows the overlay without its effects, and says so, where there is no HTML-in-Canvas", async () => {
    expect(htmlInCanvas()).toBe(false);
    const warnings: string[] = [];
    captureWarnings((m) => warnings.push(m));
    const host = document.createElement("div");
    const root = createRoot(host);
    await act(async () => {
      root.render(
        <ShaderBox id="t" width={640} height={360} passes={[pass]}>
          <p>Hello</p>
        </ShaderBox>,
      );
    });
    expect(host.querySelector("canvas")).toBeNull();
    expect(host.textContent).toBe("Hello");
    expect(warnings.join(" ")).toContain('"t" has an effect the file declares');
    root.unmount();
  });
});
