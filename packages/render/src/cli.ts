import { readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { parseArgs } from "node:util";

import { subtitles } from "@cutcraft/kit";

import { addAsset, describeAdded } from "./add";
import { QUALITIES, type QualityName, type VideoCodec } from "./encoding";
import type { FontFile, FontWeight } from "./fonts";
import { checkLayout, formatLayout, type Insets, SAFE_ZONES, type SafeZoneName } from "./layout-check";
import { loadVideo } from "./load";
import { directoryResolver } from "./media";
import { renderVideo } from "./renderer";
import { renderStill } from "./still";
import { CHROME_MILESTONE, cachedChrome, installChrome } from "./web/chrome";

/** --check-layout found issues: apart from 1 (an error) and 2 (usage), so a script can tell them apart. */
const EXIT_LAYOUT_ISSUES = 3;

const USAGE = `Usage: cutcraft <file.tsx> --out <video.mp4|.webm|.mp3|.wav> [options]
       cutcraft <file.tsx> --still <seconds> --out <image.png|.jpg> [options]
       cutcraft <file.tsx> --check-layout [--safe-zone <zone>] [--subject <x,y,w,h>] [--json] [options]
       cutcraft <file.tsx> --srt <captions.srt> | --vtt <captions.vtt> [--from <s> --to <s>]
       cutcraft add <media file>... [--manifest manifest.json] [--id <id>] [--transcript <file>]
       cutcraft browser install

  Every export draws its frames in Chrome. The first one downloads Chrome for Testing ${CHROME_MILESTONE} into
  ~/.cache/cutcraft/browsers (or CUTCRAFT_BROWSER_CACHE); CUTCRAFT_CHROMIUM names a Chrome 153+ to use instead.

  add                   write each media file's entry into the manifest (default: manifest.json beside it): its
                        kind, length, size, frame rate and sound, read from the file, and its words from the
                        transcript beside it (talk.json from Whisper or ElevenLabs, talk.vtt or talk.srt)
  --id <id>             (add) the asset id; default the file name without its extension
  --transcript <file>   (add) a transcript other than the one beside the media
  browser install       download Chrome for Testing now, rather than on the first export
  --srt <file>          also write the captions the cut plays as SRT, timed like the export (alone: only that)
  --vtt <file>          the same as WebVTT

  --out <file>          where to write; the extension picks the container: .mp4 (H.264 and AAC), .webm (VP9 and
                        Opus), or .mp3/.wav for the soundtrack alone
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
  --codec <name>        avc (default for .mp4), vp9 (default for .webm), or av1 in either
  --bitrate <bps>       video bits per second (default: about 0.1 per pixel per frame)
  --quality <preset>    very-low, low, medium, high or very-high, in place of --bitrate
  --tabs <n>            pages of the browser that render pieces at once (default 1)
  --copy                copy encoded pictures from the source where a cut shows nothing else (VP9 at the composition's
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
      tabs: { type: "string" },
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
      quiet: { type: "boolean" },
      help: { type: "boolean", short: "h" },
      id: { type: "string" },
      transcript: { type: "string" },
      srt: { type: "string" },
      vtt: { type: "string" },
    },
  });
  if (positionals[0] === "add") return add(positionals.slice(1), values);
  if (positionals[0] === "browser") {
    if (positionals[1] !== "install") {
      process.stderr.write(USAGE);
      return 2;
    }
    // A Chrome already in the cache is kept: the command needs no network then, as on a CI runner with a warm cache.
    const cached = await cachedChrome();
    const path = cached ?? (await installChrome((m) => process.stderr.write(`${m}\n`)));
    process.stderr.write(`Chrome is at ${path}${cached ? " (already in the cache)" : ""}\n`);
    return 0;
  }
  const [file] = positionals;
  const subtitlesOnly = !values.out && !values["check-layout"] && Boolean(values.srt || values.vtt);
  if (values.help || !file || (!values.out && !values["check-layout"] && !subtitlesOnly)) {
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
  // Subtitles first: they need no rendering, and a long export should not be the thing that delays them.
  for (const [format, path] of [
    ["srt", values.srt],
    ["vtt", values.vtt],
  ] as const) {
    if (!path) continue;
    const range = {
      ...(values.from ? { from: Number(values.from) } : {}),
      ...(values.to ? { to: Number(values.to) } : {}),
    };
    if (![...loaded.state.items.values()].some((p) => p.kind === "caption"))
      process.stderr.write(`warning: ${file} has no captions; ${path} holds none\n`);
    writeFileSync(resolve(path), subtitles(loaded.state, { format, ...range }));
    process.stderr.write(`${path}: ${format === "srt" ? "SRT" : "WebVTT"} captions\n`);
  }
  if (subtitlesOnly) return 0;
  const fonts = (values.font ?? []).map(readFont);
  const common = {
    state: loaded.state,
    source: loaded.source,
    media,
    fonts,
    onLog: (m: string) => process.stderr.write(`${m}\n`),
  };
  if (values["check-layout"]) {
    const result = await checkLayout({
      ...common,
      source: { ...loaded.source, file },
      ...(values["safe-zone"] ? { safeZone: readZone(values["safe-zone"]) } : {}),
      ...(values.subject ? { subject: readSubject(values.subject) } : {}),
      ...(values.step ? { step: Number(values.step) } : {}),
      ...(values.from ? { from: Number(values.from) } : {}),
      ...(values.to ? { to: Number(values.to) } : {}),
    });
    process.stdout.write(values.json ? `${JSON.stringify(result, null, 2)}\n` : formatLayout(result));
    return result.issues.length > 0 ? EXIT_LAYOUT_ISSUES : 0;
  }
  const out = values.out as string; // the usage check above: only --check-layout runs without --out
  if (values.still !== undefined) {
    const time = Number(values.still);
    if (!Number.isFinite(time)) throw new Error(`--still wants seconds, got "${values.still}"`);
    const still = await renderStill({
      ...common,
      out: resolve(out),
      time,
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
  if (values.codec !== undefined && !["avc", "vp9", "av1"].includes(values.codec))
    throw new Error(`--codec wants avc, vp9 or av1, got "${values.codec}"`);
  const tabs = values.tabs === undefined ? 1 : Math.floor(Number(values.tabs));
  if (!(tabs >= 1)) throw new Error(`--tabs wants a number of pages, got "${values.tabs}"`);
  const tty = process.stderr.isTTY && !values.quiet;
  const result = await renderVideo({
    ...common,
    out: resolve(out),
    tabs,
    ...(values.from ? { from: Number(values.from) } : {}),
    ...(values.to ? { to: Number(values.to) } : {}),
    ...(values.codec ? { videoCodec: values.codec as VideoCodec } : {}),
    ...(values.bitrate ? { bitrate: Number(values.bitrate) } : {}),
    ...(values.quality ? { quality: values.quality as QualityName } : {}),
    ...(values.silent ? { silent: true } : {}),
    ...(values.copy ? { smartCopy: true } : {}),
    ...(values.keyframe ? { keyFrameInterval: Number(values.keyframe) } : {}),
    ...(values.continue ? { onAssetError: "continue" as const } : {}),
    onProgress: tty ? (p) => process.stderr.write(`\rframe ${p.frame}/${p.frames}`) : () => undefined,
  });
  if (tty) process.stderr.write("\n");
  for (const w of result.warnings) process.stderr.write(`warning: ${w}\n`);
  const seconds = (result.wallMs / 1000).toFixed(1);
  process.stderr.write(
    `${values.out}: ${result.frames} frames, ${result.width}x${result.height} at ${result.fps} fps${result.audio ? ", with sound" : ""}, in ${seconds}s${result.tabs > 1 ? ` on ${result.tabs} tabs` : ""}${result.copiedFrames > 0 ? `, ${result.copiedFrames} frames copied` : ""} (${(result.frames / (result.wallMs / 1000)).toFixed(1)} fps)\n`,
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

/** `cutcraft add <media>...`: one manifest entry per file. */
async function add(
  files: readonly string[],
  values: { manifest?: string | undefined; id?: string | undefined; transcript?: string | undefined },
): Promise<number> {
  if (files.length === 0) {
    process.stderr.write(USAGE);
    return 2;
  }
  if (files.length > 1 && (values.id || values.transcript))
    throw new Error("--id and --transcript name one asset; add the files one at a time with them");
  for (const media of files) {
    const result = await addAsset(media, {
      ...(values.manifest ? { manifest: values.manifest } : {}),
      ...(values.id ? { id: values.id } : {}),
      ...(values.transcript ? { transcript: values.transcript } : {}),
    });
    for (const w of result.warnings) process.stderr.write(`warning: ${w}\n`);
    process.stderr.write(`${describeAdded(result)} → ${result.manifest}\n`);
  }
  return 0;
}

function readFont(spec: string): FontFile {
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
