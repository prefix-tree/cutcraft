// The README's animations: each showcase video as a small looping GIF (12 fps, an optimised palette), from the WebMs
// `pnpm render` wrote. GitHub plays GIFs in a README; it does not play committed video files.
import { execFileSync } from "node:child_process";
import { mkdirSync } from "node:fs";
import { join } from "node:path";

const from = join(import.meta.dirname, "..", "..", "docs", "public", "showcase");
const to = join(import.meta.dirname, "..", "..", "docs", "public", "readme");
mkdirSync(to, { recursive: true });

/**
 * Each video's GIF: width, frame rate and palette size. The edit leads the README and the others sit in a row under it;
 * footage that changes everywhere (the gradients) costs the most, so those get fewer frames and colours. All four come
 * to about 3.5 MB.
 */
const GIFS: Record<string, { width: number; fps: number; colors: number }> = {
  edit: { width: 480, fps: 10, colors: 64 },
  graphics: { width: 320, fps: 12, colors: 128 },
  motion: { width: 320, fps: 12, colors: 128 },
  captions: { width: 180, fps: 10, colors: 64 },
};

for (const [name, { width, fps, colors }] of Object.entries(GIFS)) {
  const filter = `fps=${fps},scale=${width}:-1:flags=lanczos,split[a][b];[a]palettegen=max_colors=${colors}:stats_mode=diff[p];[b][p]paletteuse=dither=bayer:bayer_scale=5:diff_mode=rectangle`;
  execFileSync(
    "ffmpeg",
    [
      "-hide_banner",
      "-loglevel",
      "error",
      "-y",
      "-i",
      join(from, `${name}.webm`),
      "-vf",
      filter,
      "-loop",
      "0",
      join(to, `${name}.gif`),
    ],
    { stdio: "inherit" },
  );
  process.stdout.write(`${name}.gif\n`);
}
