import type { AudioOutput, EnvelopePoint, ScheduledSource } from "../types";

interface Live { source: AudioBufferSourceNode; nodes: AudioNode[] }

/** Web Audio graph: per scheduled chunk `source → gain(envelope) → [pan] → master → destination`. */
export class WebAudioOutput implements AudioOutput {
  private readonly master: GainNode;
  private readonly live = new Map<string, Live>();

  constructor(private readonly ctx: AudioContext) {
    this.master = ctx.createGain();
    this.master.connect(ctx.destination);
  }

  get contextTime(): number { return this.ctx.currentTime; }
  get running(): boolean { return this.ctx.state === "running"; }

  schedule(src: ScheduledSource): void {
    this.cancel(src.key);
    const source = this.ctx.createBufferSource();
    source.buffer = src.buffer;
    source.playbackRate.value = src.playbackRate;
    const gain = this.ctx.createGain();
    automate(gain.gain, src.envelope, src.when, 1);
    const nodes: AudioNode[] = [gain];
    let tail: AudioNode = gain;
    if (src.pan && src.pan.length > 0 && typeof this.ctx.createStereoPanner === "function") {
      const panner = this.ctx.createStereoPanner();
      automate(panner.pan, src.pan, src.when, 0);
      tail.connect(panner);
      tail = panner;
      nodes.push(panner);
    }
    source.connect(gain);
    tail.connect(this.master);
    const when = Math.max(src.when, this.ctx.currentTime);
    const late = when - src.when;
    const offset = src.offset + late * src.playbackRate;
    const duration = src.duration - late * src.playbackRate;
    if (duration <= 0) return;
    source.onended = () => this.drop(src.key, source);
    source.start(when, offset, duration);
    this.live.set(src.key, { source, nodes });
  }

  cancel(keyPrefix: string): void {
    for (const [key, entry] of this.live) {
      if (!key.startsWith(keyPrefix)) continue;
      this.stop(entry);
      this.live.delete(key);
    }
  }

  cancelAll(): void {
    for (const entry of this.live.values()) this.stop(entry);
    this.live.clear();
  }

  setMaster(gain: number): void {
    this.master.gain.cancelScheduledValues(this.ctx.currentTime);
    this.master.gain.setTargetAtTime(gain, this.ctx.currentTime, 0.01);
  }

  async resume(): Promise<void> {
    if (this.ctx.state === "suspended") {
      try { await this.ctx.resume(); } catch { /* needs a user gesture; the clock falls back to performance time */ }
    }
  }

  private drop(key: string, source: AudioBufferSourceNode): void {
    const entry = this.live.get(key);
    if (entry && entry.source === source) {
      this.disconnect(entry);
      this.live.delete(key);
    }
  }

  private stop(entry: Live): void {
    entry.source.onended = null;
    try { entry.source.stop(); } catch { /* not started yet */ }
    this.disconnect(entry);
  }

  private disconnect(entry: Live): void {
    entry.source.disconnect();
    for (const n of entry.nodes) n.disconnect();
  }
}

/** Set an AudioParam from envelope points: the value at `when` first, then linear ramps for later points. */
function automate(param: AudioParam, points: readonly EnvelopePoint[], when: number, fallback: number): void {
  if (points.length === 0) { param.value = fallback; return; }
  const sorted = [...points].sort((a, b) => a.at - b.at);
  param.setValueAtTime(valueAt(sorted, when, fallback), Math.max(0, when));
  for (const p of sorted) if (p.at > when) param.linearRampToValueAtTime(p.value, p.at);
}

function valueAt(points: readonly EnvelopePoint[], at: number, fallback: number): number {
  const first = points[0], last = points[points.length - 1];
  if (!first || !last) return fallback;
  if (at <= first.at) return first.value;
  if (at >= last.at) return last.value;
  for (let i = 0; i < points.length - 1; i++) {
    const a = points[i]!, b = points[i + 1]!;
    if (at >= a.at && at < b.at) return b.at === a.at ? b.value : a.value + ((b.value - a.value) * (at - a.at)) / (b.at - a.at);
  }
  return last.value;
}
