import { execFileSync, spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";

import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { parseMoments, resolveMoments } from "@cutcraft/kit";

import { describeAt, inspect, loadVideo } from "../src";

const scratch = join(import.meta.dirname, ".tmp", "inspect");
let dir = "";
let file = "";

const words = Array.from({ length: 12 }, (_, i) => ({ i, text: `w${i}`, start: i * 0.5, end: i * 0.5 + 0.4 }));
const VIDEO = `import { Audio, Clip, Composition, Effect, Keyframe, Title, Track, Transition } from "@cutcraft/kit";
export const manifest = { assets: {
  talk: { id: "talk", kind: "video", duration: 10, fps: 30, width: 640, height: 360,
    audio: { sampleRate: 48000, channels: 2, streams: 1 }, transcript: { words: ${JSON.stringify(words)} } },
  broll: { id: "broll", kind: "video", duration: 10, fps: 30, width: 640, height: 360 },
  music: { id: "music", kind: "audio", duration: 30, audio: { sampleRate: 48000, channels: 2, streams: 1 } },
} };
export default function Video() {
  return (
    <Composition fps={30} width={640} height={360}>
      <Track id="main">
        <Clip id="hook" src="asset:talk" in="word:0" out="word:7.end" fade={{ in: 1 }}>
          <Effect id="lift" type="exposure" params={{ stops: 0 }}>
            <Keyframe id="k0" param="stops" at={0} value={0} />
            <Keyframe id="k1" param="stops" at={2} value={1} />
          </Effect>
          <Keyframe id="s0" property="transform.scale.x" at={0} value={1} />
          <Keyframe id="s1" property="transform.scale.x" at={2} value={1.2} />
        </Clip>
        <Transition id="x1" type="crossfade" duration={0.5} />
        <Clip id="broll" src="asset:broll" in={2} out={5} />
      </Track>
      <Track id="text">
        <Title id="point" anchor="hook" at="word:2" duration={1.5}>The point</Title>
      </Track>
      <Track id="music" layout="free">
        <Audio id="bed" src="asset:music" start={0} duration={6} volume={0.5} />
      </Track>
    </Composition>
  );
}
`;

beforeAll(() => {
  mkdirSync(scratch, { recursive: true });
  dir = mkdtempSync(join(scratch, "i-"));
  file = join(dir, "video.tsx");
  writeFileSync(file, VIDEO);
});
afterAll(() => rmSync(scratch, { recursive: true, force: true }));

const viewAt = async (list: string) => {
  const { state } = await loadVideo(file);
  expect(state.errors).toEqual([]);
  const { moments, errors } = resolveMoments(state, parseMoments(list));
  expect(errors).toEqual([]);
  return moments.map((m) => describeAt(state, m));
};

describe("describeAt", () => {
  it("lists what is drawn from the top down, with keyframed values at that moment", async () => {
    const [view] = await viewAt("1");
    expect(view?.seen.map((s) => s.id)).toEqual(["point", "hook"]);
    const hook = view?.seen[1];
    // Half way through two-second keyframes: the effect's param and the transform are half way too.
    expect(hook?.effects).toEqual([{ id: "lift", type: "exposure", params: { stops: 0.5 } }]);
    expect(hook?.transform).toEqual({ scale: { x: 1.1, y: 1 } });
    expect(hook?.sourceTime).toBe(1);
    expect(view?.seen[0]).toMatchObject({ kind: "title", text: "The point", progress: 0 });
  });

  it("says what is heard and at what gain, the word being said and nothing for a silent clip", async () => {
    const [early, later, broll] = await viewAt("0.5,1.5,5");
    // The clip fades in over its first second; the music plays at half volume throughout.
    expect(early?.heard).toEqual([
      { id: "hook", track: "main", asset: "talk", gain: 0.5 },
      { id: "bed", track: "music", asset: "music", gain: 0.5 },
    ]);
    expect(later?.heard[0]?.gain).toBe(1);
    expect(early?.word).toEqual({ i: 1, text: "w1", clip: "hook" });
    // The b-roll has no sound of its own.
    expect(broll?.heard.map((h) => h.id)).toEqual(["bed"]);
    expect(broll?.word).toBeUndefined();
  });

  it("shows both clips inside a transition and how far through it is", async () => {
    const [mid] = await viewAt("x1.mid");
    expect(mid?.seen.map((s) => [s.id, s.transition?.role])).toEqual([
      ["broll", "in"],
      ["hook", "out"],
    ]);
    // Progress is eased by the transition's curve, so half way in time is past half way through.
    expect(mid?.seen[0]?.transition?.progress).toBeGreaterThan(0.5);
    expect(mid?.seen[0]?.transition?.progress).toBeLessThan(1);
    expect(mid?.seen[1]?.transition?.progress).toBe(mid?.seen[0]?.transition?.progress);
  });
});

describe("inspect", () => {
  it("prints the timeline: the video, each track's elements in order, and the cuts", async () => {
    const { state } = await loadVideo(file);
    const { output, errors } = inspect("video.tsx", state);
    expect(errors).toEqual([]);
    expect(output).toBe(`video.tsx  640x360  30 fps  6.40 s (192 frames)  0 errors
track main (sequence)
     0.00–3.90     clip        hook  asset:talk 0.00–3.90  words 0–7 "w0 w1 w2 w3 w4 w5 w6 w7"  effects: lift(exposure stops=0)  keyframes: transform.scale.x
     3.40–3.90     transition  x1  crossfade (hook → broll)
     3.40–6.40     clip        broll  asset:broll 2.00–5.00
track text (sequence)
     1.00–2.50     title       point  "The point"  anchor hook at word:2
track music (free)
     0.00–6.00     audio       bed  asset:music 0.00–6.00
cuts: 3.40 hook→broll (x1)
`);
  });

  it("prints flat rows as JSON, with the moments when asked", async () => {
    const { state } = await loadVideo(file);
    const rows = JSON.parse(inspect("video.tsx", state, { json: true }).output);
    expect(Object.keys(rows)).toEqual([
      "composition",
      "tracks",
      "elements",
      "effects",
      "keyframes",
      "words",
      "cuts",
      "errors",
    ]);
    expect(rows.elements.find((e: { id: string }) => e.id === "broll")).toMatchObject({ start: 3.4, startFrame: 102 });
    const withAt = JSON.parse(inspect("video.tsx", state, { json: true, at: "point.start" }).output);
    expect(withAt.at).toHaveLength(1);
    expect(withAt.at[0]).toMatchObject({ label: "point.start", time: 1, frame: 30, word: { i: 2 } });
  });

  it("prints each moment, and reports the ones it cannot find", async () => {
    const { state } = await loadVideo(file);
    const { output, errors } = inspect("video.tsx", state, { at: "word:2,nope" });
    expect(errors).toEqual(['nope: the file has no element with the id "nope"']);
    expect(output).toBe(`word:2  1.00 s  frame 30  (word 2 "w2" in hook)
  seen: title point  0% through  "The point"
  seen: clip hook  26% through  source 1.00 s  transform scale.x=1.1 scale.y=1  lift(exposure stops=0.5)
  heard: hook (asset:talk) gain 1.00
  heard: bed (asset:music) gain 0.50
  said: word 2 "w2" in hook
`);
  });
});

describe("cutcraft inspect", () => {
  const cli = join(import.meta.dirname, "..", "src", "cli.ts");
  // No browser may start: one that does not exist is named, and the command still answers.
  const env = { ...process.env, CUTCRAFT_CHROMIUM: "/nonexistent/chrome" };

  it("prints the timeline without a browser, and exits 0", () => {
    const out = execFileSync("node", ["--import", "tsx", cli, "inspect", file], { encoding: "utf8", env });
    expect(out).toContain("track main (sequence)");
    expect(out).toContain("cuts: 3.40 hook→broll (x1)");
  });

  it("exits 1 and lists the forms for a moment that is not one", () => {
    const run = spawnSync("node", ["--import", "tsx", cli, "inspect", file, "--at", "1,what?"], {
      encoding: "utf8",
      env,
    });
    expect(run.status).toBe(1);
    expect(run.stdout).toContain("1  1.00 s  frame 30");
    expect(run.stderr).toContain('error: "what?" is not a moment; a moment is one of: 4.5 (seconds), 90f (a frame)');
  });

  it("exits 2 with the usage when no file is given", () => {
    const run = spawnSync("node", ["--import", "tsx", cli, "inspect"], { encoding: "utf8", env });
    expect(run.status).toBe(2);
    expect(run.stderr).toContain("cutcraft inspect <file.tsx>");
  });
});

describe("cutcraft look", () => {
  const cli = join(import.meta.dirname, "..", "src", "cli.ts");
  const env = { ...process.env, CUTCRAFT_CHROMIUM: "/nonexistent/chrome" };

  it("exits 2 with the usage when no file is given", () => {
    const run = spawnSync("node", ["--import", "tsx", cli, "look"], { encoding: "utf8", env });
    expect(run.status).toBe(2);
    expect(run.stderr).toContain("cutcraft look <file.tsx>");
  });

  it("refuses what it cannot draw before it starts a browser", () => {
    const run = spawnSync("node", ["--import", "tsx", cli, "look", file, "--without", "hook"], {
      encoding: "utf8",
      env,
    });
    expect(run.status).toBe(1);
    expect(run.stderr).toContain("error: --without hook: a clip cannot be left out without moving the cut");
  });
});
