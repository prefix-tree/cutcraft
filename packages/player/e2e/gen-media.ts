import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync } from "node:fs";
import { join } from "node:path";

/**
 * Test media, generated once with ffmpeg:
 * - bars.webm: 10 s, 30 fps, 640×360, VP9 + 440 Hz Opus. The top 45 px hold
 *   ten cells encoding the frame number in binary (bit k in cell k, LSB on
 *   the left); the counter text below is for humans.
 * - tone.ogg: 20 s of a 660 Hz Opus tone.
 * - logo.png: a red square.
 * - solid.webm: 2 s of solid blue, VP9, no audio.
 * - bars.mp4: the same picture as H.264 + AAC, used when the browser decodes it.
 */
export const mediaDir = join(import.meta.dirname, "app", "public");

const STRIP = "geq=lum='if(lt(Y,45),255*bitand(floor(N/pow(2,floor(X*10/W))),1),lum(X,Y))':cb='if(lt(Y,45),128,cb(X,Y))':cr='if(lt(Y,45),128,cr(X,Y))'";
const COUNTER = "drawtext=text='%{n}':x=10:y=60:fontsize=36:fontcolor=white:box=1:boxcolor=black";

export default function generate(): void {
  mkdirSync(mediaDir, { recursive: true });
  const run = (name: string, args: string[]): void => {
    const out = join(mediaDir, name);
    if (existsSync(out)) return;
    execFileSync("ffmpeg", ["-hide_banner", "-loglevel", "error", "-y", ...args, out], { stdio: "inherit" });
  };
  run("bars.webm", [
    "-f", "lavfi", "-i", "testsrc2=size=640x360:rate=30:duration=10",
    "-f", "lavfi", "-i", "sine=frequency=440:sample_rate=48000:duration=10",
    "-vf", `${STRIP},${COUNTER}`, "-c:v", "libvpx-vp9", "-g", "30", "-keyint_min", "30", "-b:v", "1M", "-pix_fmt", "yuv420p",
    "-c:a", "libopus", "-shortest",
  ]);
  run("tone.ogg", ["-f", "lavfi", "-i", "sine=frequency=660:sample_rate=48000:duration=20", "-c:a", "libopus"]);
  run("logo.png", ["-f", "lavfi", "-i", "color=c=red:size=128x128", "-frames:v", "1"]);
  run("solid.webm", ["-f", "lavfi", "-i", "color=c=blue:size=640x360:rate=30:duration=2", "-c:v", "libvpx-vp9", "-g", "30", "-pix_fmt", "yuv420p"]);
  try {
    run("bars.mp4", [
      "-f", "lavfi", "-i", "testsrc2=size=640x360:rate=30:duration=10",
      "-f", "lavfi", "-i", "sine=frequency=440:sample_rate=48000:duration=10",
      "-vf", `${STRIP},${COUNTER}`, "-c:v", "libx264", "-profile:v", "baseline", "-g", "30", "-pix_fmt", "yuv420p", "-c:a", "aac", "-shortest", "-movflags", "+faststart",
    ]);
  } catch {
    // Optional: the mp4 test skips when the file or the decoder is missing.
  }
}
