// Footage for the showcase. Most is made by ffmpeg's own sources (no text, so any build will do): moving gradients, a
// slow spiral, a game of life and a green screen, in the site's colours. The effect demos also use real stock footage,
// which is not committed: each clip is read from media/stock/ (fetched from its URL when one is known), checked
// against its hash, and trimmed. Skips files that exist.
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
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
  // Stand-ins for a founder and an analyst on camera (the manifest holds the words they would say), and product b-roll.
  founder:
    "gradients=s=960x540:r=30:d=14:c0=0x2a1c1a:c1=0x6b3a2a:c2=0x1b2a4a:nb_colors=3:speed=0.008:type=radial:seed=5",
  analyst:
    "gradients=s=960x540:r=30:d=14:c0=0x101421:c1=0x23395b:c2=0x1b4a4a:nb_colors=3:speed=0.008:type=radial:seed=9",
  product: "mandelbrot=s=960x540:r=30:maxiter=200:end_scale=0.6:inner=period,trim=duration=6",
  speaker:
    "gradients=s=540x960:r=30:d=12:c0=0x23395b:c1=0x3d5a80:c2=0xc8402a:nb_colors=3:speed=0.01:type=spiral:seed=2",
  // A card of fractal drifting over studio green, for the colour key demo.
  greenscreen:
    "color=c=0x00b140:s=960x540:r=30:d=4[bg];mandelbrot=s=420x280:r=30:maxiter=200:end_scale=0.6:inner=period[fg];[bg][fg]overlay=x='120+300*(0.5-0.5*cos(t*1.2))':y='130+40*sin(t*1.6)':shortest=1",
};

/** Stock footage the demos use: where it comes from, who made it, and the part of it they show. */
const stock: readonly {
  readonly id: string;
  readonly file: string;
  readonly sha256: string;
  /** A direct download, when known; otherwise the file is put in media/stock/ by hand. */
  readonly url?: string;
  readonly page: string;
  readonly credit: string;
  readonly start: number;
  readonly duration: number;
}[] = [
  {
    id: "coffee",
    file: "coffee.mp4",
    sha256: "ff53b38f45fbe292a354c1f26f047d2e46d276c7c16e4fdad41a0599afc79c79",
    page: "https://pixabay.com/videos/id-209419/",
    credit: "Pour-over coffee, Pixabay video 209419, Pixabay Content License",
    start: 0,
    duration: 20,
  },
];

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

for (const clip of stock) {
  const out = join(dir, `${clip.id}.webm`);
  if (existsSync(out)) continue;
  const raw = join(dir, "stock", clip.file);
  if (!existsSync(raw)) {
    if (!clip.url)
      throw new Error(`${clip.id}: put ${clip.file} in ${join(dir, "stock")} (from ${clip.page}); it is not committed`);
    mkdirSync(join(dir, "stock"), { recursive: true });
    const response = await fetch(clip.url);
    if (!response.ok) throw new Error(`${clip.id}: ${clip.url} answered ${response.status}`);
    writeFileSync(raw, Buffer.from(await response.arrayBuffer()));
  }
  const hash = createHash("sha256").update(readFileSync(raw)).digest("hex");
  if (hash !== clip.sha256) throw new Error(`${clip.id}: ${raw} is not the expected file (sha256 ${hash})`);
  process.stdout.write(`${clip.id}.webm\n`);
  execFileSync(
    "ffmpeg",
    [
      "-hide_banner",
      "-loglevel",
      "error",
      "-y",
      "-ss",
      String(clip.start),
      "-t",
      String(clip.duration),
      "-i",
      raw,
      "-an",
      "-vf",
      "scale=960:540,fps=30",
      "-c:v",
      "libvpx-vp9",
      "-b:v",
      "3M",
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

/** A size-5 LUT that warms, as the goldens' one: for the LUT demo. */
const cube = join(dir, "warm.cube");
if (!existsSync(cube)) {
  const n = 5;
  const lines = [`LUT_3D_SIZE ${n}`];
  for (let b = 0; b < n; b++)
    for (let g = 0; g < n; g++)
      for (let r = 0; r < n; r++) {
        const [R, G, B] = [r, g, b].map((v) => v / (n - 1)) as [number, number, number];
        lines.push(`${(R ** 0.85).toFixed(5)} ${G.toFixed(5)} ${(B ** 1.15 * 0.95).toFixed(5)}`);
      }
  writeFileSync(cube, `${lines.join("\n")}\n`);
}
