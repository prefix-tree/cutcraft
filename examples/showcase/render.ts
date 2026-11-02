// Renders each showcase file for the documentation site: a looping WebM and a poster frame in docs/public/showcase,
// through the same loader and renderer as `cutcraft`. A file that does not resolve cleanly stops the run.
import { mkdirSync } from "node:fs";
import { join } from "node:path";
import { directoryResolver, loadVideo, renderStill, renderVideo } from "@cutcraft/render";

const here = import.meta.dirname;
const out = join(here, "..", "..", "docs", "public", "showcase");
mkdirSync(out, { recursive: true });

/** Each file, and the second its poster is taken at. */
const FILES: Record<string, number> = { edit: 4, graphics: 4.5, captions: 9.2, motion: 3.5 };

for (const [name, poster] of Object.entries(FILES)) {
  const video = await loadVideo(join(here, `${name}.tsx`), { manifest: join(here, "manifest.json") });
  if (video.state.errors.length > 0) throw new Error(`${name}: ${video.state.errors.map((e) => `${e.id}: ${e.message}`).join("; ")}`);
  const media = directoryResolver(join(here, "media"), video.manifest);
  const result = await renderVideo({ state: video.state, media, interiors: video.interiors, out: join(out, `${name}.webm`), silent: true, quality: "medium" });
  for (const w of result.warnings) process.stderr.write(`${name}: warning: ${w}\n`);
  await renderStill({ state: video.state, media, interiors: video.interiors, out: join(out, `${name}.jpg`), time: poster });
  process.stdout.write(`${name}: ${result.frames} frames, ${result.width}x${result.height}, ${(result.wallMs / 1000).toFixed(1)} s\n`);
}
