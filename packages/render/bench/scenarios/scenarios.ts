// The videos every tool renders, described once: each adapter builds its own composition from these, so no tool gets a
// version written to suit it. 1080p at 30 fps, no sound (the tools mix audio too differently to compare fairly).
export const WIDTH = 1920, HEIGHT = 1080, FPS = 30;

/** Seconds of the generated footage: five four-second ranges from a 60-second file. */
const RANGES: readonly (readonly [number, number])[] = [[2, 6], [10, 14], [20, 24], [30, 34], [40, 44]];

export interface Title { readonly text: string; readonly clip: number }
export interface Box { readonly color: string; readonly from: readonly [number, number]; readonly to: readonly [number, number]; readonly size: number; readonly start: number; readonly end: number }

export interface Scenario {
  readonly name: "cuts" | "crossfades" | "graphics";
  readonly label: string;
  /** Source ranges played back to back; empty for a scenario with no footage. */
  readonly clips: readonly (readonly [number, number])[];
  /** Seconds of crossfade between consecutive clips; 0 is a hard cut. */
  readonly crossfade: number;
  /** A title over each listed clip, fading in over its first 0.4 s. */
  readonly titles: readonly Title[];
  /** Rectangles moving from one centre point to another (pixels from the frame's centre) between two times. */
  readonly boxes: readonly Box[];
  /** Length in seconds when there is no footage. */
  readonly duration: number;
}

const BOX_COLORS = ["#c8402a", "#f3ead6", "#3d5a80", "#e0a458", "#7cb7a4", "#9a86c7"];

export const SCENARIOS: readonly Scenario[] = [
  { name: "cuts", label: "Five hard cuts from one 1080p H.264 file", clips: RANGES, crossfade: 0, titles: [], boxes: [], duration: 0 },
  {
    name: "crossfades", label: "The same five shots with crossfades and a title on each", clips: RANGES, crossfade: 0.5,
    titles: RANGES.map((_, i) => ({ text: `Shot ${i + 1}`, clip: i })), boxes: [], duration: 0,
  },
  {
    name: "graphics", label: "Motion graphics with no footage: titles and moving shapes", clips: [], crossfade: 0,
    titles: [], duration: 20,
    boxes: Array.from({ length: 12 }, (_, i) => ({
      color: BOX_COLORS[i % BOX_COLORS.length]!, size: 120 + (i % 3) * 40,
      from: [-760 + (i % 6) * 300, -380 + Math.floor(i / 6) * 300] as const,
      to: [760 - (i % 6) * 300, 380 - Math.floor(i / 6) * 300] as const,
      start: (i % 4) * 2, end: 12 + (i % 4) * 2,
    })),
  },
];

/** Titles for the graphics scenario, which has no clips to hang them on: start second and text. */
export const GRAPHIC_TITLES: readonly { readonly at: number; readonly text: string }[] = [
  { at: 1, text: "Video editor as code" }, { at: 7, text: "Rendered three ways" }, { at: 13, text: "Same frames, same file" },
];
export const GRAPHIC_TITLE_LENGTH = 5;
