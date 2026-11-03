// Checks an output before its time counts: H.264 at 1920x1080 and 30 fps with the frames its own timeline says, and,
// for footage, the middle frame of every shot matching the source frame it should show: of the source frames around
// it, the expected one must score the highest PSNR, clearly. The score itself is reported as a quality figure, not a
// pass mark.
// The shots' places are found from the frame count: back to back when crossfades overlap them, end to end when not.
import { execFileSync } from "node:child_process";
import { join } from "node:path";

import { FPS, HEIGHT, type Scenario, WIDTH } from "./scenarios";

const FOOTAGE = join(import.meta.dirname, "..", ".cache", "scenarios", "footage.mp4");
/** How far the expected source frame must score above its neighbours (a right frame scores well over 10 dB above them). */
const MARGIN_DB = 1.5;

function probe(file: string): { codec: string; width: number; height: number; fps: number; frames: number } {
  const out = execFileSync(
    "ffprobe",
    [
      "-v",
      "error",
      "-select_streams",
      "v:0",
      "-count_frames",
      "-show_entries",
      "stream=codec_name,width,height,avg_frame_rate,nb_read_frames",
      "-of",
      "json",
      file,
    ],
    { encoding: "utf8" },
  );
  const s = JSON.parse(out).streams[0];
  const [n, d] = String(s.avg_frame_rate).split("/").map(Number);
  return { codec: s.codec_name, width: s.width, height: s.height, fps: n! / d!, frames: Number(s.nb_read_frames) };
}

/** Frame `n` of `file`, decoded on its own to 8-bit 4:2:0. */
function yuv(file: string, n: number): Buffer {
  return execFileSync(
    "ffmpeg",
    [
      "-v",
      "error",
      "-i",
      file,
      "-vf",
      `select=eq(n\\,${n})`,
      "-frames:v",
      "1",
      "-f",
      "rawvideo",
      "-pix_fmt",
      "yuv420p",
      "-",
    ],
    { maxBuffer: 64 << 20 },
  );
}

const sources = new Map<number, Buffer>();

/**
 * PSNR over all three planes of frame `frame` of `file` against frame `sourceFrame` of the footage. Each frame is
 * decoded on its own: ffmpeg's psnr filter fed by two selected streams paired the wrong frames and scored a matching
 * one in the low 20s.
 */
function psnr(file: string, frame: number, sourceFrame: number): number {
  const a = yuv(file, frame);
  let b = sources.get(sourceFrame);
  if (!b) sources.set(sourceFrame, (b = yuv(FOOTAGE, sourceFrame)));
  if (a.length !== b.length || a.length === 0) return 0;
  let se = 0;
  for (let i = 0; i < a.length; i++) {
    const d = a[i]! - b[i]!;
    se += d * d;
  }
  return se === 0 ? 99 : 10 * Math.log10((255 * 255 * a.length) / se);
}

export function verify(
  file: string,
  s: Scenario,
): { ok: boolean; frames: number; psnr: number | null; problems: string[] } {
  const p = probe(file);
  const problems: string[] = [];
  if (p.codec !== "h264") problems.push(`codec ${p.codec}`);
  if (p.width !== WIDTH || p.height !== HEIGHT) problems.push(`size ${p.width}x${p.height}`);
  if (Math.abs(p.fps - FPS) > 0.01) problems.push(`${p.fps.toFixed(2)} fps`);
  if (s.clips.length > 0) {
    const total = s.clips.reduce((sum, [a, b]) => sum + (b - a), 0);
    const overlapped = Math.abs(p.frames - (total - s.crossfade * (s.clips.length - 1)) * FPS) <= 1;
    if (!overlapped && Math.abs(p.frames - total * FPS) > 1)
      problems.push(
        `${p.frames} frames, expected ${(total - s.crossfade * (s.clips.length - 1)) * FPS} or ${total * FPS}`,
      );
    let t = 0;
    const scores: number[] = [];
    for (const [i, [a, b]] of s.clips.entries()) {
      const mid = (b - a) / 2;
      const frame = Math.round((t + mid) * FPS),
        expected = Math.round((a + mid) * FPS);
      const score = psnr(file, frame, expected);
      const neighbours = Math.max(psnr(file, frame, expected - 1), psnr(file, frame, expected + 1));
      if (score < neighbours + MARGIN_DB)
        problems.push(
          `shot ${i + 1}: frame ${frame} is not source frame ${expected} (${score.toFixed(1)} dB, neighbours ${neighbours.toFixed(1)})`,
        );
      scores.push(score);
      t += b - a - (overlapped && i < s.clips.length - 1 ? s.crossfade : 0);
    }
    return {
      ok: problems.length === 0,
      frames: p.frames,
      psnr: scores.reduce((x, y) => x + y, 0) / scores.length,
      problems,
    };
  }
  return { ok: problems.length === 0, frames: p.frames, psnr: null, problems };
}
