// Renders the shorts shown on the documentation site: a WebM and a poster frame in docs/public/shorts, through the
// same loader and renderer as `uberscene`. A file that does not resolve cleanly stops the run.
import { mkdirSync } from "node:fs";
import { join } from "node:path";

import { directoryResolver, loadVideo, renderStill, renderVideo } from "@uberscene/render";

const here = import.meta.dirname;
const out = join(here, "..", "..", "docs", "public", "shorts");
mkdirSync(out, { recursive: true });

/**
 * Each file on the site, the second its poster is taken at, the bitrate that keeps it small on a page, and whether it
 * has a soundtrack to keep.
 */
const FILES: Record<string, { poster: number; bitrate: number; sound?: boolean }> = {
  "game-lighting": { poster: 28, bitrate: 1_100_000 },
  "lunar-eclipse": { poster: 9.9, bitrate: 1_400_000, sound: true },
  "one-pixel": { poster: 2.6, bitrate: 900_000, sound: true },
  "hundred-videos": { poster: 21, bitrate: 1_600_000, sound: true },
  "snake-heart": { poster: 19.5, bitrate: 1_200_000, sound: true },
  // The before and after card plays the short rendered just above it, so it comes after it.
  "cards/hundred-videos-compare": { poster: 21, bitrate: 1_400_000, sound: true },
};

/** Names given on the command line render alone: `pnpm --filter @uberscene/example-shorts render game-lighting`. */
const only = process.argv.slice(2);

for (const [name, { poster, bitrate, sound }] of Object.entries(FILES)) {
  if (only.length > 0 && !only.includes(name)) continue;
  const video = await loadVideo(join(here, `${name}.tsx`), { manifest: join(here, "uberscene.json") });
  if (video.state.errors.length > 0)
    throw new Error(`${name}: ${video.state.errors.map((e) => `${e.id}: ${e.message}`).join("; ")}`);
  // A card's picture of a short is that short as it was just rendered, in the site's folder.
  const media = directoryResolver(join(here, "media"), video.manifest, {
    "hundred-videos-short": join(out, "hundred-videos.webm"),
  });
  const file = name.split("/").at(-1) as string;
  const result = await renderVideo({
    state: video.state,
    media,
    out: join(out, `${file}.webm`),
    silent: !sound,
    bitrate,
    source: video.source,
  });
  for (const w of result.warnings) process.stderr.write(`${name}: warning: ${w}\n`);
  await renderStill({ state: video.state, media, out: join(out, `${file}.jpg`), time: poster, source: video.source });
  process.stdout.write(
    `${name}: ${result.frames} frames, ${result.width}x${result.height}, ${(result.wallMs / 1000).toFixed(1)} s\n`,
  );
}
