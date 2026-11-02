import { lookupAsset, type AssetManifest } from "@cutcraft/kit";
import { INPUT_IDLE_CLOSE_S, MAX_OPEN_INPUTS } from "../constants";
import type { Clock, Frame, FrameSource, FrameSourceFactory, FrameSourceInfo, MediaResolver, PlayerErrorEvent } from "../types";
import { ErrorFrameSource } from "./frame-source";

export interface AssetSourceDeps {
  readonly media: MediaResolver;
  readonly manifest: AssetManifest;
  readonly frameSourceFactory: FrameSourceFactory;
  readonly clock: Clock;
  readonly onError: (e: PlayerErrorEvent) => void;
}

interface Entry {
  source: FrameSource;
  info: Promise<FrameSourceInfo>;
  refs: number;
  idleSince: number | null;
  lastUse: number;
}

/**
 * One FrameSource per asset, shared by every clip of that asset and by nested
 * compositors. Ref-counted; an unreferenced source stays open for a while
 * (a seek back is cheap) and is closed when idle too long or when too many
 * are open.
 */
export class AssetSources {
  private readonly entries = new Map<string, Entry>();
  private readonly errored = new Set<string>();

  constructor(private readonly deps: AssetSourceDeps) {}

  /** Acquire a reference; the source opens lazily on first use. */
  acquire(assetId: string): { source: FrameSource; info: Promise<FrameSourceInfo> } {
    let e = this.entries.get(assetId);
    if (!e) {
      const source = new LazyFrameSource(() => this.open(assetId));
      e = { source, info: source.open(), refs: 0, idleSince: null, lastUse: this.deps.clock.now() };
      void e.info.catch(() => undefined);
      this.entries.set(assetId, e);
    }
    e.refs++;
    e.idleSince = null;
    e.lastUse = this.deps.clock.now();
    return { source: e.source, info: e.info };
  }

  release(assetId: string): void {
    const e = this.entries.get(assetId);
    if (!e) return;
    e.refs = Math.max(0, e.refs - 1);
    if (e.refs === 0) e.idleSince = this.deps.clock.now();
  }

  /** Close sources idle for too long, then the least recently used idle ones beyond the cap. */
  sweep(): void {
    const now = this.deps.clock.now();
    for (const [id, e] of this.entries) {
      if (e.idleSince !== null && now - e.idleSince >= INPUT_IDLE_CLOSE_S) this.close(id);
    }
    const idle = [...this.entries].filter(([, e]) => e.idleSince !== null).sort((a, b) => a[1].lastUse - b[1].lastUse);
    let open = this.entries.size;
    for (const [id] of idle) {
      if (open <= MAX_OPEN_INPUTS) break;
      this.close(id);
      open--;
    }
  }

  get openCount(): number { return this.entries.size; }
  isOpen(assetId: string): boolean { return this.entries.has(assetId); }

  dispose(): void {
    for (const id of [...this.entries.keys()]) this.close(id);
  }

  private close(id: string): void {
    const e = this.entries.get(id);
    if (!e) return;
    e.source.close();
    this.entries.delete(id);
  }

  private async open(assetId: string): Promise<Opened> {
    const asset = lookupAsset(this.deps.manifest, assetId);
    const fail = async (error: Error): Promise<Opened> => {
      if (!this.errored.has(assetId)) {
        this.errored.add(assetId);
        this.deps.onError({ asset: assetId, error, fatal: false });
      }
      const source = new ErrorFrameSource(assetId, asset?.width ?? 640, asset?.height ?? 360);
      return { source, info: await source.open() };
    };
    try {
      const handle = await this.deps.media.resolve(assetId);
      const source = this.deps.frameSourceFactory(assetId, handle, asset?.kind ?? "video");
      const info = await source.open();
      if (!info.decodable) {
        source.close();
        return fail(new Error(`asset "${assetId}" cannot be decoded in this browser`));
      }
      return { source, info };
    } catch (error) {
      return fail(error instanceof Error ? error : new Error(String(error)));
    }
  }
}

interface Opened { source: FrameSource; info: FrameSourceInfo }

/** Opens the real source once, on first use, and forwards every call to it. */
class LazyFrameSource implements FrameSource {
  private inner: Promise<Opened> | null = null;
  private closed = false;
  constructor(private readonly factory: () => Promise<Opened>) {}

  private get(): Promise<Opened> {
    this.inner ??= this.factory();
    return this.inner;
  }
  async open(): Promise<FrameSourceInfo> { return (await this.get()).info; }
  async frameAt(t: number): Promise<Frame | null> { return (await this.get()).source.frameAt(t); }
  async *stream(from: number, to: number): AsyncGenerator<Frame, void, unknown> {
    const { source } = await this.get();
    yield* source.stream(from, to);
  }
  close(): void {
    if (this.closed) return;
    this.closed = true;
    void this.inner?.then((o) => o.source.close()).catch(() => undefined);
  }
}
