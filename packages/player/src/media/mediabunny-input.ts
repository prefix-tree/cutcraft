import { ALL_FORMATS, BlobSource, FilePathSource, Input, UrlSource } from "mediabunny";

import type { MediaHandle } from "../types";

interface Entry {
  input: Input;
  refs: number;
}

/** One mediabunny `Input` per asset, shared by the video and audio sources of that asset. */
export class MediabunnyInputs {
  private readonly entries = new Map<string, Entry>();

  acquire(assetId: string, handle: MediaHandle): Input {
    let e = this.entries.get(assetId);
    if (!e) {
      const source =
        handle.kind === "blob"
          ? new BlobSource(handle.blob)
          : handle.kind === "path"
            ? new FilePathSource(handle.path)
            : new UrlSource(handle.url);
      e = { input: new Input({ source, formats: ALL_FORMATS }), refs: 0 };
      this.entries.set(assetId, e);
    }
    e.refs++;
    return e.input;
  }

  release(assetId: string): void {
    const e = this.entries.get(assetId);
    if (!e) return;
    e.refs--;
    if (e.refs <= 0) {
      e.input.dispose();
      this.entries.delete(assetId);
    }
  }

  get openCount(): number {
    return this.entries.size;
  }

  dispose(): void {
    for (const e of this.entries.values()) e.input.dispose();
    this.entries.clear();
  }
}
