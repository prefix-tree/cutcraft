# 0030. One Chrome version: the export runs on Chrome 157 only

> Status: accepted. Supersedes the Chrome versions in [0018](./0018-free-code-in-a-timeline-skeleton.md) ("157 or
> later, or 156 with `CanvasDrawElement` enabled") and [0019](./0019-a-browser-engine-for-free-code.md) ("Chrome 153
> or later", "on by default from 157"), and the "Chrome or Chromium 153+" that `UBERSCENE_CHROMIUM` took after
> [0021](./0021-one-export-engine.md).

## Context

The export draws every frame in Chrome (0021) and downloads Chrome for Testing 157, the milestone CI tests. But a
binary named by `UBERSCENE_CHROMIUM` was used as it was, and the docs and errors promised that any Chrome 153 or later
would do. The records disagreed with each other and with `chrome.ts` on when `drawElementImage` appeared and whether
it needs the `CanvasDrawElement` flag, and none of those claims was tested: CI runs 157 only.

Running the render package's browser tests on Chrome 153 showed what another version costs. 216 of 219 tests passed;
the three golden stills of a composed frame failed because text is anti-aliased differently (about 1% of pixels, at
glyph edges). Nothing was wrong with the timing or the layout, but the export no longer matched the preview and the
goldens, which is the point of drawing with the player. HTML-in-Canvas is still behind a flag, so its behaviour may
change from one milestone to the next as well.

## Decision

- **One milestone.** `CHROME_MILESTONE` (157) in `packages/render/src/web/chrome.ts` is the only Chrome the export
  runs on: the one it downloads, the one CI tests and caches, and the one a named binary must be.
- **Checked when Chrome starts.** `BrowserEngine.open` reads the version of the browser it launched and refuses any
  other milestone before a page opens, naming the binary, its version and the way out (unset `UBERSCENE_CHROMIUM` to
  use the downloaded Chrome, or name a Chrome 157). `wrongChrome` holds the rule; it accepts any build of the
  milestone.
- **The docs say 157.** Errors, the CLI help, the CLI reference, the exporting guide and the test headers say
  "Chrome 157", not "153 or later".
- **Moving to a new milestone** is one change: `CHROME_MILESTONE`, the goldens redrawn on it
  (`UBERSCENE_UPDATE_GOLDENS=1`), and the browser tests green on it. CI's Chrome cache is keyed on `chrome.ts`, so it
  follows.

## Consequences

- An export draws the same text on every machine that can run it, and the goldens mean what they say.
- A machine without network access to Chrome for Testing needs Chrome 157 copied in (`uberscene browser install` on
  another machine and `UBERSCENE_BROWSER_CACHE`, or `UBERSCENE_CHROMIUM`). The system's own Chrome works only while it
  is 157, so following stable Chrome is no longer a way to get one.
- No escape hatch for now: a newer Chrome is refused until the milestone moves.

## Alternatives

A minimum version (the old 153+): untested in CI, and shown above to draw different text. A warning instead of a
refusal: an export that silently differs from the preview is the failure the one engine exists to avoid.
