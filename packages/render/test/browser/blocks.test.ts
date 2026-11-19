// Each block's demo passes the layout check at its frame shape: what it draws stays inside the safe zone the short
// formats share, so a block placed with its defaults is not cut off by a phone's buttons and captions.
import { join } from "node:path";

import { checkLayout, directoryResolver, listBlocks, loadVideo } from "../../src";

describe.each(listBlocks())("$name", (block) => {
  it("keeps its demo inside the safe zone", async () => {
    const demo = await loadVideo(join(block.dir, "demo.tsx"), { manifest: { assets: {} } });
    expect(demo.state.errors).toEqual([]);
    const result = await checkLayout({
      state: demo.state,
      media: directoryResolver(block.dir, demo.manifest),
      source: { ...demo.source, file: join(block.name, "demo.tsx") },
      safeZone: "tiktok",
      step: 0.5,
    });
    expect(result.issues.map((i) => i.message)).toEqual([]);
  });
});
