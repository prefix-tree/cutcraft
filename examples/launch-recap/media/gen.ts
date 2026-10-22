import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync } from "node:fs";
import { join } from "node:path";

/**
 * Placeholder footage matching `manifest.json`, generated once with ffmpeg
 * into `public/`. Swap in real files with the same names (or edit the
 * manifest) and nothing in `video.tsx` changes.
 */
const out = join(import.meta.dirname, "..", "public");
mkdirSync(out, { recursive: true });

const run = (name: string, args: string[]): void => {
  const file = join(out, name);
  if (existsSync(file)) { console.log(`${name}: exists`); return; }
  console.log(`${name}: generating`);
  execFileSync("ffmpeg", ["-hide_banner", "-loglevel", "error", "-y", ...args, file], { stdio: "inherit" });
};

const VP9 = ["-c:v", "libvpx-vp9", "-b:v", "1500k", "-g", "30", "-pix_fmt", "yuv420p"];

run("founder.webm", [
  "-f", "lavfi", "-i", "color=c=0x1d2433:size=1280x720:rate=30:duration=42",
  "-f", "lavfi", "-i", "aevalsrc='0.25*sin(2*PI*220*t)*gt(sin(2*PI*2.5*t)\\,0)':s=48000:d=42",
  "-vf", "drawtext=text='FOUNDER INTERVIEW':fontsize=64:fontcolor=white:x=(w-text_w)/2:y=(h-text_h)/2-40,drawtext=text='placeholder footage  %{pts\\:hms}':fontsize=28:fontcolor=0x9aa3b5:x=(w-text_w)/2:y=(h-text_h)/2+40",
  ...VP9, "-c:a", "libopus", "-shortest",
]);
run("product.webm", ["-f", "lavfi", "-i", "mandelbrot=size=1280x720:rate=30", "-t", "18", ...VP9, "-an"]);
run("screen.webm", ["-f", "lavfi", "-i", "life=size=1280x720:rate=30:mold=10:ratio=0.1:death_color=0x0b0d12:life_color=0x55ff99", "-t", "14", ...VP9, "-an"]);
run("music.ogg", ["-f", "lavfi", "-i", "aevalsrc='0.2*sin(2*PI*110*t)+0.15*sin(2*PI*165*t)+0.1*sin(2*PI*220*t)|0.2*sin(2*PI*110*t)+0.15*sin(2*PI*165*t)+0.1*sin(2*PI*220*t)':s=48000:d=120", "-c:a", "libopus"]);
run("logo.png", ["-f", "lavfi", "-i", "color=c=0xff5a1f:size=512x512", "-vf", "drawtext=text='S':fontsize=320:fontcolor=white:x=(w-text_w)/2:y=(h-text_h)/2", "-frames:v", "1"]);
