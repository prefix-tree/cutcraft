import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync } from "node:fs";
import { join } from "node:path";

/**
 * Placeholder footage matching `uberscene.json`, made once with ffmpeg into
 * `public/`. The pictures are cut from the showcase's four stock coffee clips
 * (run `pnpm --filter @uberscene/example-showcase gen` first, which makes
 * them in examples/showcase/media); the founder's voice is a tone with the
 * rhythm of speech, and the music a chord. Swap in real files with the same
 * names (or edit the manifest) and nothing in `video.tsx` changes.
 */
const out = join(import.meta.dirname, "..", "public");
const stock = join(import.meta.dirname, "..", "..", "showcase", "media");
for (const clip of ["coffeeWide", "espresso", "redCup"])
  if (!existsSync(join(stock, `${clip}.webm`)))
    throw new Error(`${clip}.webm is missing: run pnpm --filter @uberscene/example-showcase gen first`);
mkdirSync(out, { recursive: true });

const run = (name: string, args: string[]): void => {
  const file = join(out, name);
  if (existsSync(file)) { console.log(`${name}: exists`); return; }
  console.log(`${name}: generating`);
  execFileSync("ffmpeg", ["-hide_banner", "-loglevel", "error", "-y", ...args, file], { stdio: "inherit" });
};

const VP9 = ["-c:v", "libvpx-vp9", "-b:v", "1500k", "-g", "30", "-pix_fmt", "yuv420p"];

// The wide pour, a person at its right edge, looped to the interview's length, with the tone as the voice.
run("founder.webm", [
  "-stream_loop", "-1", "-i", join(stock, "coffeeWide.webm"),
  "-f", "lavfi", "-i", "aevalsrc='0.25*sin(2*PI*220*t)*gt(sin(2*PI*2.5*t)\\,0)':s=48000:d=42",
  "-map", "0:v", "-map", "1:a", "-t", "42", "-vf", "scale=1280:720",
  ...VP9, "-c:a", "libopus",
]);
run("product.webm", ["-i", join(stock, "espresso.webm"), "-t", "18", "-vf", "scale=1280:720", ...VP9, "-an"]);
run("screen.webm", ["-ss", "15", "-i", join(stock, "redCup.webm"), "-t", "14", "-vf", "scale=1280:720", ...VP9, "-an"]);
run("music.ogg", ["-f", "lavfi", "-i", "aevalsrc='0.2*sin(2*PI*110*t)+0.15*sin(2*PI*165*t)+0.1*sin(2*PI*220*t)|0.2*sin(2*PI*110*t)+0.15*sin(2*PI*165*t)+0.1*sin(2*PI*220*t)':s=48000:d=120", "-c:a", "libopus"]);
run("logo.png", ["-f", "lavfi", "-i", "color=c=0xff5a1f:size=512x512", "-vf", "drawtext=text='S':fontsize=320:fontcolor=white:x=(w-text_w)/2:y=(h-text_h)/2", "-frames:v", "1"]);
