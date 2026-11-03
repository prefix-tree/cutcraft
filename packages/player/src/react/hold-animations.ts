/**
 * Holds the CSS animations under `root` at `seconds` past the layer's start: paused, and seeked there. They then
 * follow the video's clock (play, pause, scrub both ways) and an export captures the same frame twice.
 *
 * Only CSS animations: their zero is the moment their element got the style, which inside a Layer is the layer's
 * start. A Web Animation made with `element.animate()` or by a library keeps its own start and its owner's clock.
 */
export function holdCssAnimations(root: Element | null, seconds: number): void {
  if (!root || typeof root.getAnimations !== "function" || typeof CSSAnimation === "undefined") return;
  const ms = seconds * 1000;
  for (const animation of root.getAnimations({ subtree: true })) {
    if (!(animation instanceof CSSAnimation)) continue;
    if (animation.playState !== "paused") animation.pause();
    if (animation.currentTime !== ms) animation.currentTime = ms;
  }
}
