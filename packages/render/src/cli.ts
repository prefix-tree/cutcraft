import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { parseArgs } from "node:util";

import { checkLayout, formatLayout, type Insets, SAFE_ZONES, type SafeZoneName } from "./layout-check";
import { loadVideo } from "./load";
import { directoryResolver } from "./media";
import type { FontWeight, OverlayFont } from "./overlays";
import { defaultWorkers } from "./parallel";
import { renderVideo, type VideoCodec } from "./renderer";
import { QUALITIES, type QualityName, type Speed } from "./segment";
import { renderStill } from "./still";

/** --check-layout found issues: apart from 1 (an error) and 2 (usage), so a script can tell them apart. */
const EXIT_LAYOUT_ISSUES = 3;

const USAGE = `Usage: cutcraft <file.tsx> --out <video.webm|.mp4|.mov|.mp3|.wav> [options]
       cutcraft <file.tsx> --still <seconds> --out <image.png|.jpg> [options]
       cutcraft <file.tsx> --check-layout [--safe-zone <zone>] [--subject <x,y,w,h>] [--json] [options]

  --out <file>          where to write; the extension picks the container: .webm, .mp4, .mov (ProRes),
                        or .mp3/.wav for the soundtrack alone
  --still <s>           write the frame at this time as a PNG or JPEG instead of a video
  --check-layout        print every overlay that leaves the frame or the safe zone, or covers captions or the
                        subject: where it is in the file, when, and how to fix it, as a compiler does; writes no file
  --json                print the layout check as JSON instead; it exits 3 when it finds issues
  --safe-zone <zone>    tiktok, reels, shorts, title-safe (default) or action-safe, or top,right,bottom,left fractions
  --subject <x,y,w,h>   where the subject is, as fractions of the frame, for footage the manifest has no subjects for
  --step <s>            seconds between layout samples (default: every frame)
  --manifest <file>     asset manifest JSON (default: the file's \`manifest\` export)
  --media <dir>         folder holding one file per asset id (default: the file's folder)
  --props <json>        props for the file's component
  --from <s> --to <s>   render only this part of the composition
  --codec <name>        vp9 (default for webm), vp8, av1, avc (default for mp4), hevc, prores (default for mov)
  --bitrate <bps>       video bits per second (default: about 0.1 per pixel per frame)
  --quality <preset>    very-low, low, medium, high or very-high, in place of --bitrate
  --speed <s>           balanced (default), quality (x264's medium: smaller, about half as fast) or fast (real-time mode)
  --software            encode H.264 and HEVC in software even where the machine has a hardware encoder
  --workers <n>         render in n threads (default 1, this one; more rarely helps, as the encoder is threaded itself)
  --copy                copy encoded pictures from the source where a cut shows nothing else (VP8/VP9 at the composition's
                        size and rate), and render only the ends; fast for plain cuts
  --keyframe <seconds>  seconds between keyframes (default 2)
  --silent              no soundtrack
  --font <spec>         extra font for titles: Name=file.ttf, Name:700=file.ttf or Name:700:italic=file.ttf
  --import <spec>       a module the file may import beyond react, zod and the kit: three, or name=specifier
                        (a package, or a path relative to the file); the editor must offer the same modules
  --continue            draw the grey placeholder for an asset that cannot be read, instead of failing
  --quiet               no progress
`;

async function main(): Promise<number> {
  const { values, positionals } = parseArgs({
    allowPositionals: true,
    options: {
      out: { type: "string" },
      workers: { type: "string" },
      speed: { type: "string" },
      keyframe: { type: "string" },
      manifest: { type: "string" },
      media: { type: "string" },
      props: { type: "string" },
      from: { type: "string" },
      to: { type: "string" },
      codec: { type: "string" },
      bitrate: { type: "string" },
      quality: { type: "string" },
      still: { type: "string" },
      "check-layout": { type: "boolean" },
      json: { type: "boolean" },
      "safe-zone": { type: "string" },
      subject: { type: "string" },
      step: { type: "string" },
      silent: { type: "boolean" },
      font: { type: "string", multiple: true },
      import: { type: "string", multiple: true },
      continue: { type: "boolean" },
      copy: { type: "boolean" },
      software: { type: "boolean" },
      quiet: { type: "boolean" },
      help: { type: "boolean", short: "h" },
    },
  });
  const [file] = positionals;
  if (values.help || !file || (!values.out && !values["check-layout"])) {
    process.stderr.write(USAGE);
    return values.help ? 0 : 2;
  }
  const loadOptions = {
    ...(values.manifest ? { manifest: resolve(values.manifest) } : {}),
    ...(values.props ? { props: JSON.parse(values.props) as Record<string, unknown> } : {}),
    ...(values.import ? { imports: Object.fromEntries(values.import.map(readImport)) } : {}),
  };
  const loaded = await loadVideo(file, loadOptions);
  for (const e of loaded.state.errors) process.stderr.write(`warning: ${e.id ?? "?"}: ${e.message}\n`);
  const media = directoryResolver(resolve(values.media ?? dirname(file)), loaded.manifest);
  const fonts = (values.font ?? []).map(readFont);
  if (values["check-layout"]) {
    const result = await checkLayout({
      state: loaded.state,
      media,
      interiors: loaded.interiors,
      fonts,
      ...(values["safe-zone"] ? { safeZone: readZone(values["safe-zone"]) } : {}),
      ...(values.subject ? { subject: readSubject(values.subject) } : {}),
      ...(values.step ? { step: Number(values.step) } : {}),
      ...(values.from ? { from: Number(values.from) } : {}),
      ...(values.to ? { to: Number(values.to) } : {}),
      source: { file, text: readFileSync(file, "utf8") },
    });
    process.stdout.write(values.json ? `${JSON.stringify(result, null, 2)}\n` : formatLayout(result));
    return result.issues.length > 0 ? EXIT_LAYOUT_ISSUES : 0;
  }
  const out = values.out as string; // the usage check above: only --check-layout runs without --out
  if (values.still !== undefined) {
    const time = Number(values.still);
    if (!Number.isFinite(time)) throw new Error(`--still wants seconds, got "${values.still}"`);
    const still = await renderStill({
      state: loaded.state,
      media,
      out: resolve(out),
      interiors: loaded.interiors,
      time,
      fonts,
      ...(values.continue ? { onAssetError: "continue" as const } : {}),
    });
    for (const w of still.warnings) process.stderr.write(`warning: ${w}\n`);
    process.stderr.write(`${values.out}: frame ${still.frame}, ${still.width}x${still.height}\n`);
    return 0;
  }
  if (values.quality !== undefined && !(values.quality in QUALITIES))
    throw new Error(`--quality wants ${Object.keys(QUALITIES).join(", ")}, got "${values.quality}"`);
  if (values.quality !== undefined && values.bitrate !== undefined)
    throw new Error("--quality and --bitrate both set the size; pass one");
  const tty = process.stderr.isTTY && !values.quiet;
  const workers = values.workers === undefined ? defaultWorkers() : Math.max(1, Math.floor(Number(values.workers)));
  if (!Number.isFinite(workers)) throw new Error(`--workers wants a number, got "${values.workers}"`);
  if (values.speed !== undefined && !["quality", "balanced", "fast"].includes(values.speed))
    throw new Error(`--speed wants quality, balanced or fast, got "${values.speed}"`);
  const result = await renderVideo({
    state: loaded.state,
    media,
    out: resolve(out),
    interiors: loaded.interiors,
    ...(values.from ? { from: Number(values.from) } : {}),
    ...(values.to ? { to: Number(values.to) } : {}),
    ...(values.codec ? { videoCodec: values.codec as VideoCodec } : {}),
    ...(values.bitrate ? { bitrate: Number(values.bitrate) } : {}),
    ...(values.quality ? { quality: values.quality as QualityName } : {}),
    ...(values.silent ? { silent: true } : {}),
    ...(values.speed ? { speed: values.speed as Speed } : {}),
    ...(values.copy ? { smartCopy: true } : {}),
    ...(values.software ? { hardware: false } : {}),
    ...(values.keyframe ? { keyFrameInterval: Number(values.keyframe) } : {}),
    ...(workers > 1
      ? {
          parallel: {
            file: resolve(file),
            load: loadOptions,
            mediaDir: resolve(values.media ?? dirname(file)),
            workers,
          },
        }
      : {}),
    ...(values.continue ? { onAssetError: "continue" as const } : {}),
    fonts,
    onProgress: tty ? (p) => process.stderr.write(`\rframe ${p.frame}/${p.frames}`) : () => undefined,
  });
  if (tty) process.stderr.write("\n");
  for (const w of result.warnings) process.stderr.write(`warning: ${w}\n`);
  const seconds = (result.wallMs / 1000).toFixed(1);
  process.stderr.write(
    `${values.out}: ${result.frames} frames, ${result.width}x${result.height} at ${result.fps} fps${result.audio ? ", with sound" : ""}, in ${seconds}s${result.workers > 1 ? ` on ${result.workers} threads` : ""}${result.copiedFrames > 0 ? `, ${result.copiedFrames} frames copied` : ""} (${(result.frames / (result.wallMs / 1000)).toFixed(1)} fps)\n`,
  );
  return 0;
}

function numbers(spec: string, flag: string): number[] {
  const parts = spec.split(",").map(Number);
  if (parts.length !== 4 || !parts.every((v) => Number.isFinite(v) && v >= 0 && v <= 1))
    throw new Error(`${flag} wants four fractions 0..1 separated by commas, got "${spec}"`);
  return parts;
}

function readZone(spec: string): SafeZoneName | Insets {
  if (spec in SAFE_ZONES) return spec as SafeZoneName;
  if (!spec.includes(","))
    throw new Error(`--safe-zone wants ${Object.keys(SAFE_ZONES).join(", ")} or top,right,bottom,left, got "${spec}"`);
  const [top = 0, right = 0, bottom = 0, left = 0] = numbers(spec, "--safe-zone");
  return { top, right, bottom, left };
}

function readSubject(spec: string): { x: number; y: number; w: number; h: number } {
  const [x = 0, y = 0, w = 0, h = 0] = numbers(spec, "--subject");
  return { x, y, w, h };
}

function readFont(spec: string): OverlayFont {
  const eq = spec.indexOf("=");
  if (eq < 1) throw new Error(`--font wants Name=file, got "${spec}"`);
  const [name = "", weight, style] = spec.slice(0, eq).split(":");
  const w = weight ? Number(weight) : 400;
  if (![100, 200, 300, 400, 500, 600, 700, 800, 900].includes(w))
    throw new Error(`--font weight must be 100 to 900, got "${weight}"`);
  if (style && style !== "normal" && style !== "italic")
    throw new Error(`--font style must be normal or italic, got "${style}"`);
  return {
    name,
    data: readFileSync(spec.slice(eq + 1)),
    weight: w as FontWeight,
    style: style === "italic" ? "italic" : "normal",
  };
}

/** `three` offers the package under its own name; `name=specifier` offers a package or a file under the name the cut imports. */
function readImport(spec: string): [string, string] {
  const eq = spec.indexOf("=");
  if (eq === 0) throw new Error(`--import wants name or name=specifier, got "${spec}"`);
  return eq < 0 ? [spec, spec] : [spec.slice(0, eq), spec.slice(eq + 1)];
}

main().then(
  (code) => process.exit(code),
  (error: unknown) => {
    process.stderr.write(`error: ${error instanceof Error ? error.message : String(error)}\n`);
    process.exit(1);
  },
);
