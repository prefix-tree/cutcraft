import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import generateMedia, { mediaDir } from "../../player/e2e/gen-media";
import { probe } from "./helpers/output";

const root = join(import.meta.dirname, "..");
// Inside the package so the file can import @cutcut/kit.
const scratch = join(root, "test", ".tmp", "cli");
const cli = join(root, "src", "cli.ts");
const composition = join(root, "..", "player", "e2e", "app", "composition.tsx");
let dir = "";

function run(...args: string[]) {
  return spawnSync(join(root, "node_modules", ".bin", "tsx"), [cli, ...args], { cwd: dir, encoding: "utf8" });
}

beforeAll(() => {
  generateMedia();
  mkdirSync(scratch, { recursive: true });
  dir = mkdtempSync(join(scratch, "cli-"));
});
afterAll(() => rmSync(scratch, { recursive: true, force: true }));

describe("cutcut-render", () => {
  it("renders a TSX file with its own manifest and the asset folder", () => {
    const out = join(dir, "one.webm");
    const r = run(composition, "--media", mediaDir, "--out", out, "--to", "1", "--quiet");
    expect(r.stderr).toMatch(/30 frames, 640x360 at 30 fps, with sound/);
    expect(r.status).toBe(0);
    expect(probe(out)).toMatchObject({ codec: "vp9", frames: 30, audioStreams: 1 });
  });

  it("takes a manifest file, a silent flag and an mp4 name", () => {
    const manifest = join(dir, "manifest.json");
    writeFileSync(manifest, JSON.stringify({ assets: { bars: { id: "bars", kind: "video", duration: 10, fps: 30, width: 640, height: 360 } } }));
    const file = join(dir, "tiny.tsx");
    writeFileSync(file, `import { Clip, Composition, Track } from "@cutcut/kit";\nexport default function Video() { return <Composition fps={30} width={640} height={360}><Track id="t"><Clip id="c" src="asset:bars" in={0} out={0.5} /></Track></Composition>; }\n`);
    const out = join(dir, "tiny.mp4");
    const r = run(file, "--manifest", manifest, "--media", mediaDir, "--out", out, "--silent", "--quiet");
    expect(r.stderr).toContain("15 frames");
    expect(r.status).toBe(0);
    expect(probe(out)).toMatchObject({ codec: "h264", frames: 15, audioStreams: 0 });
  });

  it("writes a still, and refuses a quality preset alongside a bitrate", () => {
    const out = join(dir, "frame.jpg");
    const r = run(composition, "--media", mediaDir, "--still", "1", "--out", out);
    expect(r.stderr).toContain("frame 30, 640x360");
    expect(r.status).toBe(0);
    expect(readFileSync(out).subarray(0, 2)).toEqual(Buffer.from([0xff, 0xd8]));
    const q = run(composition, "--media", mediaDir, "--out", join(dir, "q.webm"), "--quality", "high", "--bitrate", "1000000");
    expect(q.status).toBe(1);
    expect(q.stderr).toContain("pass one");
  });

  it("explains a missing asset and exits non-zero", () => {
    const r = run(composition, "--media", join(dir, "nowhere"), "--out", join(dir, "x.webm"), "--to", "1", "--quiet");
    expect(r.status).toBe(1);
    expect(r.stderr).toMatch(/error: .*no media file for asset "bars"/);
  });

  it("prints usage when there is nothing to render", () => {
    const r = run();
    expect(r.status).toBe(2);
    expect(r.stderr).toContain("Usage: cutcut-render");
  });
});
