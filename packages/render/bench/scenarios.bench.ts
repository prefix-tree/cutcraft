// Export speed on the comparison's three scenarios (cuts, crossfades with titles, motion graphics), CutCraft alone:
// H.264 MP4 at 1080p30 and 8 Mb/s, as the comparison renders them. For each scenario: the shipped defaults, a sweep of
// worker counts, the time per frame in each stage on one thread, and the output checked frame by frame.
//   pnpm --filter @cutcraft/render bench:scenarios [--only <name>] [--runs <n>] [--workers 1,2,4] [--speed <s>] [--json <file>]
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { cpus } from "node:os";
import { join } from "node:path";
import { parseArgs } from "node:util";
import { loadVideo } from "../src/load";
import { directoryResolver } from "../src/media";
import { defaultWorkers } from "../src/parallel";
import { renderVideo, type RenderResult } from "../src/renderer";
import type { Speed } from "../src/segment";
import { SCENARIOS } from "./scenarios/scenarios";
import { verify } from "./scenarios/verify";

const cache = join(import.meta.dirname, ".cache", "scenarios");
const file = join(import.meta.dirname, "scenarios", "video.tsx");
const BITRATE = 8_000_000;

/** The footage the footage scenarios cut from: 60 s of testsrc2 at 1080p30 as H.264, a keyframe every second. */
function footage(): void {
  mkdirSync(cache, { recursive: true });
  const out = join(cache, "footage.mp4");
  if (existsSync(out)) return;
  execFileSync("ffmpeg", ["-hide_banner", "-loglevel", "error", "-y", "-f", "lavfi", "-i", "testsrc2=s=1920x1080:r=30:d=60",
    "-c:v", "libx264", "-preset", "medium", "-crf", "20", "-g", "30", "-pix_fmt", "yuv420p", "-movflags", "+faststart", out], { stdio: "inherit" });
}

async function render(scenario: string, workers: number, speed?: Speed): Promise<RenderResult> {
  const load = { props: { scenario } };
  const video = await loadVideo(file, load);
  if (video.state.errors.length > 0) throw new Error(`${scenario}: ${video.state.errors.map((e) => e.message).join("; ")}`);
  return renderVideo({
    state: video.state, media: directoryResolver(cache, video.manifest), interiors: video.interiors, out: join(cache, `${scenario}-${workers}.mp4`),
    videoCodec: "avc", bitrate: BITRATE, silent: true, ...(speed ? { speed } : {}),
    ...(workers > 1 ? { parallel: { file, load, mediaDir: cache, workers } } : {}),
  });
}

const fps = (r: RenderResult): number => r.frames / (r.wallMs / 1000);
const median = (xs: number[]): number => [...xs].sort((a, b) => a - b)[Math.floor(xs.length / 2)]!;

async function main(): Promise<void> {
  const { values } = parseArgs({ options: { only: { type: "string" }, runs: { type: "string" }, workers: { type: "string" }, json: { type: "string" }, speed: { type: "string" } } });
  const runs = Math.max(1, Number(values.runs ?? 2));
  const sweep = (values.workers ?? "1,2,4").split(",").map(Number).filter((n) => n >= 1);
  const shipped = defaultWorkers();
  const speed = values.speed as Speed | undefined;
  footage();
  const machine = `${cpus()[0]?.model ?? "?"}, ${cpus().length} cores`;
  console.log(`${machine}, Node ${process.version}; median of ${runs} runs after a warm-up; shipped default: ${shipped} worker${shipped === 1 ? "" : "s"}${speed ? `; --speed ${speed}` : ""}`);
  const rows = [];
  for (const s of SCENARIOS) {
    if (values.only && !s.name.includes(values.only)) continue;
    const byWorkers: Record<string, number> = {};
    for (const w of [...new Set([shipped, ...sweep])]) {
      await render(s.name, w, speed);
      const times: number[] = [];
      for (let i = 0; i < runs; i++) times.push(fps(await render(s.name, w, speed)));
      byWorkers[w] = Math.round(median(times));
    }
    // One thread shows where a frame's time goes; the stages overlap with workers.
    const one = await render(s.name, 1, speed);
    const per = (ms: number): number => Math.round((ms / one.frames) * 100) / 100;
    const check = verify(join(cache, `${s.name}-${shipped}.mp4`), s);
    const row = { scenario: s.name, frames: one.frames, defaultFps: byWorkers[shipped]!, byWorkers, msPerFrame: { composite: per(one.stagesMs.composite), overlays: per(one.stagesMs.overlays), readback: per(one.stagesMs.readback), encodeWait: per(one.stagesMs.encode) }, psnr: check.psnr === null ? null : Math.round(check.psnr * 10) / 10, ok: check.ok, problems: check.problems };
    rows.push(row);
    if (!check.ok) process.exitCode = 1;
  }
  console.log(`\n| scenario | frames | default fps | ${sweep.map((w) => `${w} worker${w === 1 ? "" : "s"}`).join(" | ")} | composite | overlays | readback | encode wait | PSNR | check |`);
  console.log(`|---|---|---|${sweep.map(() => "---").join("|")}|---|---|---|---|---|---|`);
  for (const r of rows) {
    const m = r.msPerFrame;
    console.log(`| ${r.scenario} | ${r.frames} | ${r.defaultFps} | ${sweep.map((w) => r.byWorkers[w]).join(" | ")} | ${m.composite} | ${m.overlays} | ${m.readback} | ${m.encodeWait} | ${r.psnr ?? "–"} | ${r.ok ? "ok" : r.problems.join("; ")} |`);
  }
  console.log("\n(stage columns: ms per frame on one thread)");
  if (values.json) writeFileSync(values.json, `${JSON.stringify({ measured: new Date().toISOString(), machine, node: process.version, runs, shippedWorkers: shipped, speed: speed ?? "default", rows }, null, 2)}\n`);
}

main().catch((error: unknown) => { console.error(error); process.exit(1); });
