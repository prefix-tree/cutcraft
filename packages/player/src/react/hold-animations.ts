/** The layer time, in seconds, at which each transition or scripted animation began. */
const began = new WeakMap<Animation, number>();

/**
 * Holds every animation under `root` at `seconds` past the layer's start: paused, and seeked there. They then follow
 * the video's clock (play, pause, scrub both ways) and an export captures the same frame twice.
 *
 * A CSS animation's zero is the moment its element got the style, which inside a Layer is the layer's start. So is
 * that of an animation the interior makes with `element.animate()` as it mounts (`mounting`): a layer mounts at its
 * start when the video plays through, and wherever a seek or a piece of an export first shows it.
 *
 * A CSS transition, or an `element.animate()` made later, begins at the layer time it is first seen here: the render
 * that started it, as the video plays or exports frame by frame. A seek that jumps over that render finds it late or
 * not at all, and one back across it starts the transition the other way: these scrub within their run, not across
 * its start, and an export in several pieces can cut one short.
 */
export function holdCssAnimations(root: Element | null, seconds: number, mounting = false): void {
  if (!root || typeof root.getAnimations !== "function" || typeof CSSAnimation === "undefined") return;
  for (const animation of root.getAnimations({ subtree: true })) {
    let zero = 0;
    if (!(animation instanceof CSSAnimation)) {
      zero = began.get(animation) ?? (mounting ? 0 : seconds);
      began.set(animation, zero);
    }
    const ms = Math.max(0, seconds - zero) * 1000;
    if (animation.playState !== "paused") animation.pause();
    if (animation.currentTime !== ms) animation.currentTime = ms;
  }
}
