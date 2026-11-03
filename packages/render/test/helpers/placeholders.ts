import { execFileSync } from "node:child_process";
import { mkdirSync } from "node:fs";
import { join } from "node:path";

import type { AssetManifest } from "@cutcraft/kit";

/** Writes a small stand-in file for every asset in a manifest: test patterns with the declared length, channels and tone. */
export function makePlaceholders(manifest: AssetManifest, dir: string): void {
  mkdirSync(dir, { recursive: true });
  const ff = (...args: string[]): void => {
    execFileSync("ffmpeg", ["-v", "error", "-y", ...args], { stdio: "inherit" });
  };
  for (const asset of Object.values(manifest.assets)) {
    const length = String(Math.max(1, asset.duration));
    const channels = String(asset.audio?.channels ?? 1);
    if (asset.kind === "image") {
      ff(
        "-f",
        "lavfi",
        "-i",
        `testsrc2=size=${Math.round((asset.width ?? 300) / 10)}x${Math.round((asset.height ?? 200) / 10)}`,
        "-frames:v",
        "1",
        join(dir, `${asset.id}.png`),
      );
    } else if (asset.kind === "audio") {
      ff(
        "-f",
        "lavfi",
        "-i",
        `sine=frequency=330:sample_rate=48000:duration=${length}`,
        "-ac",
        channels,
        "-c:a",
        "libopus",
        join(dir, `${asset.id}.ogg`),
      );
    } else {
      const audio = asset.audio
        ? [
            "-f",
            "lavfi",
            "-i",
            `sine=frequency=220:sample_rate=48000:duration=${length}`,
            "-ac",
            channels,
            "-c:a",
            "libopus",
          ]
        : [];
      ff(
        "-f",
        "lavfi",
        "-i",
        `testsrc2=size=160x90:rate=10:duration=${length}`,
        ...audio,
        "-c:v",
        "libvpx-vp9",
        "-deadline",
        "realtime",
        "-cpu-used",
        "8",
        "-g",
        "10",
        "-b:v",
        "80k",
        "-pix_fmt",
        "yuv420p",
        join(dir, `${asset.id}.webm`),
      );
    }
  }
}
