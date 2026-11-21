// Draws each block's preview.png: its demo's frame at the second its meta names, set in a card with the block's name,
// all cards the same size so `uberscene blocks --sheet` only pastes them. Run after changing a block or its demo:
// `pnpm blocks:previews` (or with names, to draw only those).
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { collectModule, loadModule, resolve } from "@uberscene/sdk";

import { listBlocks } from "../src/blocks";
import { loadVideo } from "../src/load";
import { directoryResolver } from "../src/media";
import { renderStill } from "../src/still";

const root = new URL("../../../blocks/", import.meta.url).pathname;
const only = process.argv.slice(2);
const scratch = mkdtempSync(join(tmpdir(), "uberscene-previews-"));
const CARD = { width: 360, height: 400, picture: { width: 336, height: 320 } };

/** A video of one frame: the picture of the demo, fitted in the card, and the block's name under it. */
function cardSource(name: string, png: Buffer): string {
  const picture = `data:image/png;base64,${png.toString("base64")}`;
  return `import { Composition, Layer, Track } from "@uberscene/kit";

export default function Card() {
  return (
    <Composition fps={1} width={${CARD.width}} height={${CARD.height}} background={{ type: "color", color: "#16161d" }}>
      <Track id="cards" layout="free">
        <Layer id="card" start={0} duration={1}>
          <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", gap: 14, paddingTop: 12, color: "#f5f7ff", fontFamily: "Inter, sans-serif" }}>
            <img alt="" src=${JSON.stringify(picture)} style={{ width: ${CARD.picture.width}, height: ${CARD.picture.height}, objectFit: "contain" }} />
            <div style={{ fontSize: 22, fontWeight: 700, letterSpacing: 0.5 }}>${name}</div>
          </div>
        </Layer>
      </Track>
    </Composition>
  );
}
`;
}

try {
  for (const block of listBlocks({ source: root })) {
    const { name, dir } = block;
    if (only.length > 0 && !only.includes(name)) continue;
    const demo = await loadVideo(join(dir, "demo.tsx"), { manifest: { assets: {} } });
    if (demo.state.errors.length > 0)
      throw new Error(`${name}/demo.tsx: ${demo.state.errors.map((e) => `${e.id}: ${e.message}`).join("; ")}`);
    const frame = join(scratch, `${name}.png`);
    const media = directoryResolver(dir, demo.manifest);
    await renderStill({
      state: demo.state,
      source: demo.source,
      media,
      out: frame,
      time: block.poster,
    });

    const card = cardSource(name, readFileSync(frame));
    const manifest = { assets: {} };
    const state = resolve(collectModule(loadModule(card) as never), manifest);
    if (state.errors.length > 0)
      throw new Error(`the card did not resolve: ${state.errors.map((e) => e.message).join("; ")}`);
    await renderStill({
      state,
      source: { text: card, manifest },
      media: directoryResolver(scratch, manifest),
      out: join(dir, "preview.png"),
      time: 0,
    });
    process.stdout.write(`${name}/preview.png\n`);
  }
} finally {
  rmSync(scratch, { recursive: true, force: true });
}
