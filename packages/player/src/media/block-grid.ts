// Where decoded audio lands in a range. Containers that count time in milliseconds (WebM) round each block's time, and
// Mediabunny shifts a WebM's Opus by its rounded codec delay, so a block read after a seek can be a millisecond off: 48
// samples, half a cycle of a 440 Hz tone. The preview's audio source and the export's PCM both place blocks with this.

/**
 * How much earlier than a range decoding starts, the start then dropped: a decoder started mid-stream needs it to
 * settle (Opus asks for 80 ms, RFC 7845), and its first block, cut short by Opus's pre-skip applied again after a seek,
 * falls there. The native decoder (`uberscene-codec decode-audio`) does the same.
 */
export const AUDIO_PREROLL_SECONDS = 0.12;

/**
 * The samples where a stream's blocks start: every block after the first holds `frames` frames (960 for Opus, 1024 for
 * AAC, 1152 for MP3), so they start at `base + k × frames`, `base` being where the second one starts.
 */
export interface BlockGrid {
  readonly base: number;
  readonly frames: number;
}

/** The grid of a stream, from its first two blocks decoded from the start, where their times are exact. */
export function blockGrid(
  first: { readonly start: number; readonly frames: number } | undefined,
  second: { readonly start: number; readonly frames: number } | undefined,
): BlockGrid | null {
  return first && second && second.frames > 0 ? { base: second.start, frames: second.frames } : null;
}

/**
 * The sample a decoded block starts at. A block of the grid's length goes on the grid; any other, or one whose time is
 * not near a grid line, keeps its own time.
 */
export function blockStart(seconds: number, frames: number, sampleRate: number, grid: BlockGrid | null): number {
  const raw = seconds * sampleRate;
  if (!grid || frames !== grid.frames) return Math.round(raw);
  const snapped = grid.base + Math.round((raw - grid.base) / grid.frames) * grid.frames;
  return Math.abs(snapped - raw) <= grid.frames / 4 ? snapped : Math.round(raw);
}
