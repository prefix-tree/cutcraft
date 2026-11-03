// Footage for the showcase, made by ffmpeg's own sources (no text, so any build will do): moving gradients, a slow
// spiral, and a game of life, in the site's colours. Skips files that exist.
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync } from "node:fs";
import { join } from "node:path";

const dir = join(import.meta.dirname, "media");
mkdirSync(dir, { recursive: true });

const clips: Record<string, string> = {
  aurora:
    "gradients=s=960x540:r=30:d=8:c0=0x101421:c1=0x23395b:c2=0xc8402a:c3=0x3d5a80:nb_colors=4:speed=0.02:type=radial:seed=7",
  spiral:
    "gradients=s=960x540:r=30:d=8:c0=0x1b2a4a:c1=0xc8402a:c2=0x101421:nb_colors=3:speed=0.015:type=spiral:seed=11",
  cells:
    "life=s=240x135:r=30:mold=10:ratio=0.12:seed=3:life_color=0x3d5a80:death_color=0x101421:mold_color=0x23395b,scale=960:540:flags=neighbor,trim=duration=8",
  speaker:
    "gradients=s=540x960:r=30:d=12:c0=0x23395b:c1=0x3d5a80:c2=0xc8402a:nb_colors=3:speed=0.01:type=spiral:seed=2",
};

for (const [name, source] of Object.entries(clips)) {
  const out = join(dir, `${name}.webm`);
  if (existsSync(out)) continue;
  process.stdout.write(`${name}.webm\n`);
  execFileSync(
    "ffmpeg",
    [
      "-hide_banner",
      "-loglevel",
      "error",
      "-y",
      "-f",
      "lavfi",
      "-i",
      source,
      "-c:v",
      "libvpx-vp9",
      "-b:v",
      "2M",
      "-g",
      "30",
      "-deadline",
      "realtime",
      "-cpu-used",
      "8",
      "-pix_fmt",
      "yuv420p",
      out,
    ],
    { stdio: "inherit" },
  );
}
