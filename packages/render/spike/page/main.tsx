// Spike export page: the real Player, stepped frame by frame, captured with HTML-in-Canvas, encoded with WebCodecs.
import "@cutcraft/player/fonts.css";
import { collectModule, resolve } from "@cutcraft/kit";
import { Player, type PlayerRef } from "@cutcraft/player";
import { BufferTarget, CanvasSource, Mp4OutputFormat, Output } from "mediabunny";
import { createRef } from "react";
import { createRoot } from "react-dom/client";
import * as bench from "../../bench/scenarios/video";
import * as free from "../free";

declare global { interface Window { __ready?: boolean; __render(opts: { from?: number; to?: number }): Promise<unknown> } }

const params = new URLSearchParams(location.search);
const file = (params.get("scenario") === "free" ? free : bench) as typeof bench;
const props = { ...file.defaults, scenario: params.get("scenario") ?? "cuts" };
const state = resolve(collectModule(file, props), file.manifest);
const element = file.default(props);
const { width, height, fps, duration } = state.composition;
const media = { footage: `/@fs${params.get("footage")}` };

const cap = document.getElementById("cap") as HTMLCanvasElement;
cap.width = width; cap.height = height;
const root = document.getElementById("root") as HTMLDivElement;
root.style.width = `${width}px`; root.style.height = `${height}px`;
const ref = createRef<PlayerRef>();
createRoot(root).render(<Player ref={ref} state={state} element={element} media={media} fit="none" controls={false} />);

const painted = (): Promise<void> => new Promise((r) => { cap.addEventListener("paint", () => r(), { once: true }); (cap as unknown as { requestPaint(): void }).requestPaint(); });

window.__render = async ({ from = 0, to = duration }) => {
  const core = ref.current!.core;
  const ctx = cap.getContext("2d")!;
  const target = new BufferTarget();
  const output = new Output({ format: new Mp4OutputFormat(), target });
  const source = new CanvasSource(cap, { codec: "avc", bitrate: 8_000_000, keyFrameInterval: 2 });
  output.addVideoTrack(source, { frameRate: fps });
  await output.start();
  const first = Math.round(from * fps), last = Math.ceil(to * fps - 1e-6);
  const stages = { step: 0, paint: 0, draw: 0, encode: 0 };
  const hashes: number[] | null = params.has("hash") ? [] : null;
  const t0 = performance.now();
  for (let n = first; n < last; n++) {
    let at = performance.now();
    await core.compositor.step(n / fps);
    // Virtual time for CSS and Web Animations: every animation paused at the frame's time.
    for (const anim of document.getAnimations()) { anim.pause(); anim.currentTime = (n / fps) * 1000; }
    stages.step += performance.now() - at; at = performance.now();
    await painted();
    stages.paint += performance.now() - at; at = performance.now();
    ctx.clearRect(0, 0, width, height);
    (ctx as unknown as { drawElementImage(e: Element, x: number, y: number): void }).drawElementImage(root, 0, 0);
    if (hashes) { const d = ctx.getImageData(0, 0, width, height).data; let h = 2166136261; for (let i = 0; i < d.length; i += 7) h = Math.imul(h ^ d[i], 16777619); hashes.push(h >>> 0); }
    stages.draw += performance.now() - at; at = performance.now();
    await source.add((n - first) / fps, 1 / fps);
    stages.encode += performance.now() - at;
  }
  await output.finalize();
  const ms = performance.now() - t0, frames = last - first;
  const bytes = new Uint8Array(target.buffer!);
  let b64 = ""; for (let i = 0; i < bytes.length; i += 0x8000) b64 += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return { frames, ms, fps: frames / (ms / 1000), perFrame: Object.fromEntries(Object.entries(stages).map(([k, v]) => [k, +(v / frames).toFixed(2)])), mp4: btoa(b64), hashes };
};
const wait = (): void => { if (ref.current) window.__ready = true; else requestAnimationFrame(wait); };
wait();
