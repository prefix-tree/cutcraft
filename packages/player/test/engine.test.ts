// @vitest-environment node
import { readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";

const src = join(import.meta.dirname, "..", "src");

/** Every player source file reachable from `entry` through relative imports. */
function reachable(entry: string): string[] {
  const seen = new Set<string>();
  const queue = [entry];
  while (queue.length > 0) {
    const file = queue.pop() as string;
    if (seen.has(file)) continue;
    seen.add(file);
    const text = readFileSync(file, "utf8");
    for (const m of text.matchAll(/(?:from|import)\s*\(?\s*["'](\.{1,2}\/[^"']*)["']/g)) {
      const base = resolve(dirname(file), m[1] as string);
      for (const candidate of [`${base}.ts`, `${base}.tsx`, join(base, "index.ts")]) {
        try { readFileSync(candidate); queue.push(candidate); break; } catch { /* next candidate */ }
      }
    }
  }
  return [...seen];
}

describe("@cutcut/player/engine", () => {
  it("reaches no React layer, react-dom, Web Audio output or PlayerCore", () => {
    const files = reachable(join(src, "engine.ts"));
    expect(files.length).toBeGreaterThan(20);
    expect(files.filter((f) => f.includes(`${join(src, "react")}`))).toEqual([]);
    for (const banned of ["player.ts", "web-audio-output.ts", "audio-engine.ts", "audio-clock.ts", "transport.ts"]) {
      expect(files.filter((f) => f.endsWith(`/${banned}`)), banned).toEqual([]);
    }
    for (const f of files) expect(readFileSync(f, "utf8"), f).not.toMatch(/from\s+["']react-dom/);
  });

  it("loads in plain Node and exports the engine surface", async () => {
    expect(typeof document).toBe("undefined");
    expect(typeof window).toBe("undefined");
    const engine = await import("../src/engine");
    for (const name of ["Compositor", "CanvasPainter", "DecoderPool", "AssetSources", "buildFramePlan", "buildAudioPlan", "frameIndex", "PICK_EPS", "ManualClock", "makeNestedResolver"]) {
      expect(engine, name).toHaveProperty(name);
    }
    expect(engine).not.toHaveProperty("PlayerCore");
    expect(engine).not.toHaveProperty("Player");
  });
});

describe("@cutcut/player/overlays", () => {
  it("reaches no hooks, react-dom, React layer or browser globals, so Node can render it", async () => {
    const files = reachable(join(src, "overlays.ts"));
    expect(files.length).toBeGreaterThan(5);
    expect(files.filter((f) => f.includes(`${join(src, "react")}`))).toEqual([]);
    for (const f of files) {
      const text = readFileSync(f, "utf8");
      expect(text, f).not.toMatch(/from\s+["']react-dom/);
      expect(text, f).not.toMatch(/\buse(State|Effect|Context|Memo|Ref|Callback)\b/);
      expect(text, f).not.toMatch(/\b(document|window)\./);
    }
    expect(typeof document).toBe("undefined");
    const overlays = await import("../src/overlays");
    for (const name of ["overlayLayout", "titleContent", "shapeContent", "captionsContent", "layerContent", "indexLayerInteriors"]) expect(overlays, name).toHaveProperty(name);
  });
});
