import type { ResolvedState } from "./resolve";

export interface SubtitleOptions {
  readonly format: "srt" | "vtt";
  /** Seconds into the composition where the exported file starts; cues are shifted back by it. Default 0. */
  readonly from?: number;
  /** Seconds into the composition where the exported file ends. Default the composition's end. */
  readonly to?: number;
}

/** One cue as a subtitle file holds it: output seconds and text. */
interface Line {
  readonly start: number;
  readonly end: number;
  readonly text: string;
}

/**
 * The captions the cut plays, as an SRT or WebVTT file: every `<Caption>` under a `<Captions>`, written in the file
 * or generated from a transcript, at the times the video shows them. With `from`/`to` (an export of part of the
 * composition), cues are clipped to that range and timed from its start, so they line up with that file.
 */
export function subtitles(state: ResolvedState, options: SubtitleOptions): string {
  const from = Math.max(0, options.from ?? 0);
  const to = Math.min(state.composition.duration, options.to ?? state.composition.duration);
  const lines: Line[] = [];
  for (const p of state.items.values()) {
    if (p.kind !== "caption" || state.items.get(p.parent ?? "")?.kind !== "captions") continue;
    const start = Math.max(p.start, from);
    const end = Math.min(p.end, to);
    const text = String(p.props.text ?? "").trim();
    if (end <= start || !text) continue;
    lines.push({ start: start - from, end: end - from, text });
  }
  lines.sort((a, b) => a.start - b.start || a.end - b.end);
  if (options.format === "vtt")
    return `WEBVTT\n\n${lines.map((l) => `${stamp(l.start, ".")} --> ${stamp(l.end, ".")}\n${l.text}\n`).join("\n")}`;
  return lines.map((l, n) => `${n + 1}\n${stamp(l.start, ",")} --> ${stamp(l.end, ",")}\n${l.text}\n`).join("\n");
}

/** `HH:MM:SS,mmm` (SRT) or `HH:MM:SS.mmm` (WebVTT). */
function stamp(seconds: number, mark: "," | "."): string {
  const total = Math.round(seconds * 1000);
  const h = Math.floor(total / 3_600_000);
  const m = Math.floor(total / 60_000) % 60;
  const s = Math.floor(total / 1000) % 60;
  const pad = (n: number, w = 2) => String(n).padStart(w, "0");
  return `${pad(h)}:${pad(m)}:${pad(s)}${mark}${pad(total % 1000, 3)}`;
}
