/** Seconds before a clip starts at which its decoder is mounted. */
export const MOUNT_AHEAD_S = 2.0;
/** Seconds after a clip ends for which its decoder is kept. */
export const UNMOUNT_BEHIND_S = 0.5;
/** Seconds an unreferenced mediabunny Input stays open before it is disposed. */
export const INPUT_IDLE_CLOSE_S = 10;
/** Hard cap on open Inputs; idle ones are evicted LRU first. */
export const MAX_OPEN_INPUTS = 6;
/** Decoded frames a clip decoder keeps queued ahead of the play head. */
export const QUEUE_TARGET = 8;
export const QUEUE_MAX = 10;
/** Effective speed (clip speed × rate) above which frames are fetched by seek per tick instead of streamed. */
export const SEEK_MODE_SPEED = 4;
/** Reverse playback pre-decodes this window behind the cursor. */
export const REVERSE_WINDOW_S = 1.0;
export const REVERSE_WINDOW_FRAMES = 16;
/** Longest wait for a frame in `wait` mode (seek, export) before drawing without it. */
export const FRAME_WAIT_MS = 250;
/** Audio scheduler period and horizon. */
export const SCHEDULER_MS = 100;
export const LOOKAHEAD_S = 0.2;
/** Source ranges longer than twice this are decoded in chunks of this length. */
export const AUDIO_CHUNK_S = 30;
/** LRU cap, in decoded seconds, on cached PCM. */
export const AUDIO_CACHE_S = 600;
/** Pre-decode window on play, and how long play() waits for it. */
export const AUDIO_PRIME_S = 0.5;
export const PLAY_PRIME_TIMEOUT_MS = 500;
/** Ducking defaults. */
export const DUCK_ATTACK_S = 0.1;
export const DUCK_RELEASE_S = 0.3;
/** Sampling step for multiplied gain ramps. */
export const ENVELOPE_STEP_S = 0.05;
/** Playback rate clamp. */
export const MIN_RATE = 0.25;
export const MAX_RATE = 4;
/** Quiet time after the last setState before a paused preview fetches its exact frame. */
export const SETTLE_MS = 120;
/** Tolerance when rounding a time to a frame index. */
export const FRAME_EPS = 1e-6;
/**
 * Container timestamps are often rounded to the millisecond, so the frame for
 * the exact time n/fps can sit a fraction of a millisecond after it. A frame
 * is picked when its timestamp is at most this far past the wanted time.
 */
export const PICK_EPS = 0.001;
