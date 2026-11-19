/** The layer time, in seconds, at which each transition or scripted animation began. */
const began = new WeakMap<Animation, number>();
/** Animations a library already drives on the video's clock: paused when first seen here, and left alone. */
const driven = new WeakSet<Animation>();

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
 *
 * An animation that is already paused when first seen is a library's own, set to the layer's time by that library, and
 * is not touched.
 */
export function holdCssAnimations(root: Element | null, seconds: number, mounting = false): void {
  if (!root || typeof root.getAnimations !== "function" || typeof CSSAnimation === "undefined") return;
  for (const animation of root.getAnimations({ subtree: true })) {
    if (driven.has(animation)) continue;
    let zero = 0;
    if (!(animation instanceof CSSAnimation)) {
      // A library that seeks its own animations (Motion's sequences under `useTimeline`, a GSAP or Anime.js timeline
      // under `useSeekable`) builds them paused and sets their time from the layer's. Seeking them again here would
      // put each segment at the layer's time and lose its own delay.
      if (!began.has(animation) && animation.playState === "paused") {
        driven.add(animation);
        continue;
      }
      zero = began.get(animation) ?? (mounting ? 0 : seconds);
      began.set(animation, zero);
    }
    const ms = Math.max(0, seconds - zero) * 1000;
    if (animation.playState !== "paused") animation.pause();
    if (animation.currentTime !== ms) animation.currentTime = ms;
  }
}
