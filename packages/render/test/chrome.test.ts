// The export runs on one Chrome milestone: any other is refused before a page opens, with what to do instead.
import { describe, expect, it } from "vitest";

import { CHROME_MILESTONE, wrongChrome } from "../src/web/chrome";

describe("wrongChrome", () => {
  it("accepts any build of the pinned milestone", () => {
    expect(wrongChrome(`${CHROME_MILESTONE}.0.8080.0`, "/opt/chrome")).toBeNull();
    expect(wrongChrome(`${CHROME_MILESTONE}.0.7999.12`, "/opt/chrome")).toBeNull();
  });

  it("refuses an older or newer milestone, naming the binary, its version and the way out", () => {
    for (const version of ["153.0.8010.12", `${Number(CHROME_MILESTONE) + 1}.0.8200.0`]) {
      const message = wrongChrome(version, "/opt/chrome");
      expect(message).toContain(`Chrome ${CHROME_MILESTONE} only`);
      expect(message).toContain(`/opt/chrome is Chrome ${version}`);
      expect(message).toContain("uberscene browser install");
    }
  });

  it("refuses a version it cannot read", () => {
    expect(wrongChrome("unknown", "/opt/chrome")).toContain("is Chrome unknown");
  });
});
