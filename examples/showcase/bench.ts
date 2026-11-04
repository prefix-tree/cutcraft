// Export speed on the showcase files: each rendered to WebM on one thread and on four, best of three, in frames per
// second of wall time. Needs only the generated footage (`pnpm gen`), so any machine can reproduce it. `--json <file>`
// also writes the rows, with the machine, for the site's benchmarks.
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { cpus, tmpdir } from "node:os";
import { join } from "node:path";

import { directoryResolver, loadVideo, renderVideo } from "@cutcraft/render";

const here = import.meta.dirname;
const scratch = mkdtempSync(join(tmpdir(), "cutcraft-bench-"));
process.stdout.write(`${cpus()[0]?.model ?? "?"}, ${cpus().length} cores, Node ${process.version}\n\n`);
process.stdout.write("file        size       frames   1 thread    4 threads\n");
const rows: { file: string; width: number; height: number; frames: number; fps1: number; fps4: number }[] = [];
try {
  // The Node engine's speed: the files it draws (the others need the browser engine).
  for (const name of ["edit", "captions"]) {
    const file = join(here, `${name}.tsx`);
    const load = { manifest: join(here, "manifest.json") };
    const video = await loadVideo(file, load);
    const media = directoryResolver(join(here, "media"), video.manifest);
    const fps = async (workers: number): Promise<{ fps: number; frames: number }> => {
      let best = 0,
        frames = 0;
      for (let run = 0; run < 3; run++) {
        const r = await renderVideo({
          state: video.state,
          media,
          interiors: video.interiors,
          out: join(scratch, `${name}-${workers}.webm`),
          silent: true,
          ...(workers > 1 ? { parallel: { file, load, mediaDir: join(here, "media"), workers } } : {}),
        });
        frames = r.frames;
        best = Math.max(best, r.frames / (r.wallMs / 1000));
      }
      return { fps: best, frames };
    };
    const one = await fps(1),
      four = await fps(4);
    const { width, height } = video.state.composition;
    rows.push({ file: name, width, height, frames: one.frames, fps1: Math.round(one.fps), fps4: Math.round(four.fps) });
    process.stdout.write(
      `${name.padEnd(11)} ${`${width}x${height}`.padEnd(10)} ${String(one.frames).padStart(6)}   ${one.fps.toFixed(0).padStart(5)} fps   ${four.fps.toFixed(0).padStart(5)} fps\n`,
    );
  }
} finally {
  rmSync(scratch, { recursive: true, force: true });
}
const json = process.argv.indexOf("--json");
if (json >= 0 && process.argv[json + 1]) {
  writeFileSync(
    process.argv[json + 1]!,
    `${JSON.stringify({ machine: `${cpus()[0]?.model ?? "?"}, ${cpus().length} cores`, node: process.version, rows }, null, 2)}\n`,
  );
}
