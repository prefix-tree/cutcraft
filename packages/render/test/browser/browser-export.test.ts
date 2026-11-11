// The export engine: <Three> and <Motion> export as the player shows them, frame by frame, and pieces rendered on
// several pages join into the same file as one page writes. Needs a Chrome or Chromium 153+ in CUTCRAFT_CHROMIUM (Playwright's pinned Chromium is too old for
// drawElementImage).
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";

import { manifest as mediaManifest } from "../../../player/e2e/app/composition";
import generateMedia, { mediaDir } from "../../../player/e2e/gen-media";
import { directoryResolver, loadVideo, renderStill, renderVideo } from "../../src";
import { BrowserEngine } from "../../src/web/engine";
import { type DecodedFrame, decodeAudio, decodeFrames, pixel } from "../helpers/output";

const scratch = join(import.meta.dirname, "..", ".tmp", "browser-export");
let dir = "";

// A three.js cube from 0 s and a word that Motion fades in, on a layer that starts at 0.5 s: the layer's own clock,
// not the composition's, decides how far the fade has got.
const ENGINES = `import { Composition, Motion, Three, Track } from "@cutcraft/kit";
export const manifest = { assets: {} };
export default function Video() {
  return (
    <Composition fps={30} width={640} height={360}>
      <Track id="fx" layout="free">
        <Three id="cube" start={0} duration={2} camera={{ position: [0, 0, 4], fov: 40 }} background="#102030"
          setup={({ scene, THREE }) => {
            const box = new THREE.Mesh(new THREE.BoxGeometry(1.4, 1.4, 1.4), new THREE.MeshBasicMaterial({ color: "#ff3300" }));
            scene.add(box);
            return ({ time }) => { box.rotation.set(time, time * 1.3, 0); };
          }} />
        <Motion id="word" start={0.5} duration={1.5} sequence={[["p", { opacity: [0, 1] }, { duration: 0.5 }]]}>
          <p style={{ position: "absolute", left: 20, top: 20, width: 200, height: 60, margin: 0, background: "#ffffff" }} />
        </Motion>
      </Track>
    </Composition>
  );
}
`;

beforeAll(() => {
  generateMedia();
  mkdirSync(scratch, { recursive: true });
  dir = mkdtempSync(join(scratch, "b-"));
});
afterAll(() => rmSync(scratch, { recursive: true, force: true }));

function cut(name: string, text: string): string {
  const file = join(dir, name);
  writeFileSync(file, text);
  return file;
}

async function framesAt(file: string, times: readonly number[], fps: number): Promise<Map<number, DecodedFrame>> {
  const wanted = new Map(times.map((t) => [Math.round(t * fps), t]));
  const out = new Map<number, DecodedFrame>();
  await decodeFrames(file, (frame, i) => {
    const t = wanted.get(i);
    if (t !== undefined) out.set(t, { ...frame, rgba: frame.rgba.slice() });
  });
  return out;
}

const isOrange = ([r, g, b]: readonly [number, number, number]): boolean => r > 200 && g < 140 && b < 80;
const isWhite = ([r, g, b]: readonly [number, number, number]): boolean => r > 220 && g > 220 && b > 220;
const isNight = ([r, g, b]: readonly [number, number, number]): boolean => r < 50 && g < 60 && b < 80;

it("exports three.js and Motion as the player draws them, on each layer's own clock", async () => {
  const loaded = await loadVideo(cut("engines.tsx", ENGINES));
  const out = join(dir, "engines.mp4");
  const result = await renderVideo({
    state: loaded.state,
    media: directoryResolver(dir, loaded.manifest),
    out,
    source: loaded.source,
  });
  expect(result.frames).toBe(60);
  expect(result.warnings.filter((w) => w.includes("needs a browser"))).toEqual([]);
  const frames = await framesAt(out, [0.2, 1.2], 30);
  const early = frames.get(0.2) as DecodedFrame;
  const late = frames.get(1.2) as DecodedFrame;
  // The cube is in the middle from the start, on the scene's background.
  expect(isOrange(pixel(early, 320, 180))).toBe(true);
  expect(isNight(pixel(early, 600, 340))).toBe(true);
  // The word's layer starts at 0.5 s: hidden at 0.2 s, fully in by 1.2 s (0.7 s into its 0.5 s fade).
  expect(isWhite(pixel(early, 120, 50))).toBe(false);
  expect(isWhite(pixel(late, 120, 50))).toBe(true);
});

it("draws the same picture for a frame however it was reached, in any browser session", async () => {
  const open = () =>
    BrowserEngine.open({
      source: ENGINES,
      manifest: { assets: {} },
      media: directoryResolver(dir, { assets: {} }),
    });
  const a = await open();
  let forward: Uint8Array;
  let back: Uint8Array;
  try {
    forward = await a.still(0.8, "image/png");
    await a.still(1.9, "image/png");
    back = await a.still(0.8, "image/png"); // scrubbed back from 1.9 s
  } finally {
    await a.close();
  }
  const b = await open();
  let fresh: Uint8Array;
  try {
    fresh = await b.still(0.8, "image/png");
  } finally {
    await b.close();
  }
  expect(Buffer.from(back).equals(Buffer.from(forward))).toBe(true);
  expect(Buffer.from(fresh).equals(Buffer.from(forward))).toBe(true);
});

it("writes a still of a three.js frame", async () => {
  const loaded = await loadVideo(cut("still.tsx", ENGINES));
  const out = join(dir, "still.png");
  const still = await renderStill({
    state: loaded.state,
    media: directoryResolver(dir, loaded.manifest),
    out,
    time: 1.2,
    source: loaded.source,
  });
  expect(still.frame).toBe(36);
  expect(readFileSync(out).subarray(1, 4).toString()).toBe("PNG");
});

it("writes the same sound and pictures on several pages as on one", async () => {
  const file = cut(
    "plain.tsx",
    `import { Clip, Composition, Title, Track } from "@cutcraft/kit";
export const manifest = ${JSON.stringify(mediaManifest)};
export default function Video() {
  return (
    <Composition fps={30} width={640} height={360}>
      <Track id="m"><Clip id="c" src="asset:bars" in={1} out={3} /></Track>
      <Track id="o" layout="free"><Title id="t" start={0.2} duration={1.5}>Three pages</Title></Track>
    </Composition>
  );
}
`,
  );
  const loaded = await loadVideo(file);
  const media = directoryResolver(mediaDir, loaded.manifest);
  const one = join(dir, "one.mp4");
  const three = join(dir, "three.mp4");
  const a = await renderVideo({ state: loaded.state, media, out: one, source: loaded.source, keyFrameInterval: 0.5 });
  const b = await renderVideo({
    state: loaded.state,
    media,
    out: three,
    source: loaded.source,
    keyFrameInterval: 0.5,
    tabs: 3,
  });
  expect([a.audio, b.audio, a.frames, b.frames, b.tabs]).toEqual([true, true, 60, 60, 3]);
  // The soundtrack is mixed once, so it is the same file's sound either way.
  const sa = decodeAudio(one);
  const sb = decodeAudio(three);
  expect(sb.length).toBe(sa.length);
  let worst = 0;
  for (let i = 0; i < sa.length; i++) worst = Math.max(worst, Math.abs((sb[i] as number) - (sa[i] as number)));
  expect(worst).toBeLessThan(1e-3);
  // A frame inside a later piece: the same picture within the encoder's differences.
  const fa = (await framesAt(one, [1.0], 30)).get(1.0) as DecodedFrame;
  const fb = (await framesAt(three, [1.0], 30)).get(1.0) as DecodedFrame;
  let sum = 0;
  for (let i = 0; i < fa.rgba.length; i++) sum += Math.abs((fb.rgba[i] as number) - (fa.rgba[i] as number));
  expect(sum / fa.rgba.length).toBeLessThan(4);
});

it("keeps a three.js scene on screen, and sets it up once, when an effect on it starts to do something", async () => {
  // The glow is at 0 until 0.5 s, where it has no pass at all, then rises. The scene counts its own setups in the
  // red of its background, so a second setup shows.
  const source = `import { Composition, Effect, Keyframe, Three, Track } from "@cutcraft/kit";
export const manifest = { assets: {} };
let setups = 0;
export default function Video() {
  return (
    <Composition fps={30} width={320} height={180}>
      <Track id="fx" layout="free">
        <Three id="cube" start={0} duration={1} camera={{ position: [0, 0, 4], fov: 40 }}
          setup={({ scene, THREE }) => {
            setups++;
            scene.background = new THREE.Color(setups === 1 ? "#102030" : "#ff0000");
            const box = new THREE.Mesh(new THREE.BoxGeometry(1.4, 1.4, 1.4), new THREE.MeshBasicMaterial({ color: "#ff3300" }));
            scene.add(box);
            return ({ time }) => { box.rotation.set(time, time * 1.3, 0); };
          }}>
          <Effect id="glow" type="glow" params={{ radius: 4, intensity: 0, threshold: 0.95, tint: 0 }}>
            <Keyframe id="k1" param="intensity" at={0.5} value={0} />
            <Keyframe id="k2" param="intensity" at={0.6} value={1} />
          </Effect>
        </Three>
      </Track>
    </Composition>
  );
}
`;
  const loaded = await loadVideo(cut("glow.tsx", source));
  expect(loaded.state.errors).toEqual([]);
  const out = join(dir, "glow.mp4");
  await renderVideo({
    state: loaded.state,
    media: directoryResolver(dir, loaded.manifest),
    out,
    source: loaded.source,
  });
  const times = [0.4, 0.5, 16 / 30, 17 / 30, 0.6, 0.7, 0.9];
  const frames = await framesAt(out, times, 30);
  for (const t of times) {
    const frame = frames.get(t) as DecodedFrame;
    expect({ t, cube: isOrange(pixel(frame, 160, 90)), ground: isNight(pixel(frame, 300, 170)) }).toEqual({
      t,
      cube: true,
      ground: true,
    });
  }
});
