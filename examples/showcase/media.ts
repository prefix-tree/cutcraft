// Footage for the showcase. Every moving picture comes from four stock coffee clips, which are not committed: each is
// read from media/stock/ (fetched from its URL when one is known), checked against its hash, and trimmed. The
// stand-ins that carry words in the manifest (a founder, an analyst, a speaker on a phone) and the product b-roll are
// cut from those clips, so their ids, lengths and transcripts stay as the demos expect. The green screen is a coffee
// shot over studio green, for the colour key demo. Skips files that exist.
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

import { SOUNDS, wav } from "../shorts/media/sounds";

const dir = join(import.meta.dirname, "media");
mkdirSync(dir, { recursive: true });

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
  {
    id: "coffeeWide",
    file: "coffee-wide.mp4",
    sha256: "8430ed80518688d8bcad2890744ad3e7c22b7172bec9ab19e1a27b8f1643205f",
    page: "https://pixabay.com/videos/id-209424/",
    credit: "Pour-over coffee, wide, Pixabay video 209424, Pixabay Content License",
    start: 0,
    duration: 36,
  },
  {
    // The download's name (46989-449623829_medium.mp4) gives the Pixabay video's id.
    id: "espresso",
    file: "espresso.mp4",
    sha256: "d3cab14722d4e26efc3a2e29931ace323cf21cacb08f64772f4d65f96ec75377",
    page: "https://pixabay.com/videos/id-46989/",
    credit: "Espresso machine filling three glasses, Pixabay video 46989, Pixabay Content License",
    start: 0,
    duration: 34,
  },
  {
    // The download's name (251-135872129_medium.mp4) gives the Pixabay video's id. The machine's maker has nothing to
    // do with this project; its badge is in the shot as it was filmed.
    id: "redCup",
    file: "red-cup.mp4",
    sha256: "032a519f45df31d1a2339be8cb9796350826138555549755a678a29bd4d8df86",
    page: "https://pixabay.com/videos/id-251/",
    credit: "Espresso into a red paper cup, with steam, Pixabay video 251, Pixabay Content License",
    start: 0,
    duration: 60,
  },
];

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

/**
 * Pictures cut from the stock clips for the ids the demos name: where each comes from, the part of it, and a filter to
 * crop or frame it. Their lengths and sizes match the manifest.
 */
const cuts: Record<
  string,
  { readonly from: string; readonly start: number; readonly duration: number; readonly vf?: string }
> = {
  // The wide pour has a person at the right edge: the founder on camera.
  founder: { from: "coffeeWide", start: 0, duration: 14 },
  // Hands bringing a jug to the red cup: the analyst's shot.
  analyst: { from: "redCup", start: 38, duration: 14 },
  // The machine filling its third glass: the product b-roll.
  product: { from: "espresso", start: 25, duration: 6 },
  // A tall crop of the red cup filling: the speaker on a phone.
  speaker: { from: "redCup", start: 15, duration: 12, vf: "crop=304:540:365:0,scale=540:960" },
};

for (const [id, cut] of Object.entries(cuts)) {
  const out = join(dir, `${id}.webm`);
  if (existsSync(out)) continue;
  process.stdout.write(`${id}.webm\n`);
  execFileSync(
    "ffmpeg",
    [
      "-hide_banner",
      "-loglevel",
      "error",
      "-y",
      "-ss",
      String(cut.start),
      "-t",
      String(cut.duration),
      "-i",
      join(dir, `${cut.from}.webm`),
      "-an",
      ...(cut.vf ? ["-vf", cut.vf] : []),
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

/** A card of the close pour drifting over studio green, for the colour key demo. */
const greenscreen = join(dir, "greenscreen.webm");
if (!existsSync(greenscreen)) {
  process.stdout.write("greenscreen.webm\n");
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
      "color=c=0x00b140:s=960x540:r=30:d=4",
      "-ss",
      "12",
      "-t",
      "4",
      "-i",
      join(dir, "coffee.webm"),
      "-filter_complex",
      "[1:v]scale=420:236[fg];[0:v][fg]overlay=x='120+300*(0.5-0.5*cos(t*1.2))':y='150+40*sin(t*1.6)':shortest=1",
      "-an",
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
      greenscreen,
    ],
    { stdio: "inherit" },
  );
}

/** A sticker image: a five-pointed star in the site's amber, for the <Sticker> example. */
const star = join(dir, "star.svg");
if (!existsSync(star)) {
  const points = Array.from({ length: 10 }, (_, i) => {
    const r = i % 2 === 0 ? 120 : 52;
    const a = (Math.PI / 5) * i - Math.PI / 2;
    return `${(128 + r * Math.cos(a)).toFixed(1)},${(132 + r * Math.sin(a)).toFixed(1)}`;
  });
  writeFileSync(
    star,
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256"><polygon points="${points.join(" ")}" fill="#e8a33d" stroke="#101421" stroke-width="8" stroke-linejoin="round"/></svg>\n`,
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

/** Sound cues for the coffee film, made by the shorts' synth, so they are the same bytes as the shorts' own. */
for (const id of ["whoosh", "swish", "click", "pop", "riser", "chime"]) {
  const file = join(dir, `${id}.wav`);
  if (existsSync(file)) continue;
  writeFileSync(file, wav((SOUNDS[id] as () => Float32Array)()));
  process.stdout.write(`${id}.wav\n`);
}
