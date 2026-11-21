import { Pause, Play, SkipBack, Volume2, VolumeX } from "lucide-react";
import { useEffect, useState } from "react";

import { useCompositionTime, usePlayer } from "@uberscene/player";

import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { cn } from "@/lib/utils";

const read = (core: ReturnType<typeof usePlayer>) => ({
  playing: core.isPlaying(),
  rate: core.playbackRate,
  muted: core.muted,
});

/** The player's play state, rate and mute, kept in step with its events. */
function usePlayback() {
  const core = usePlayer();
  const [now, setNow] = useState(() => read(core));
  useEffect(() => {
    const offs = (["play", "pause", "ended", "ratechange", "volumechange"] as const).map((type) =>
      core.addEventListener(type, () => setNow(read(core))),
    );
    return () => offs.forEach((off) => off());
  }, [core]);
  return now;
}

const RATES = ["0.5", "1", "1.5", "2"];

/** Play and pause, back to the start, a scrubber, the time, the rate and mute. */
export function Transport({ className }: { className?: string }) {
  const core = usePlayer();
  const time = useCompositionTime();
  const { playing, rate, muted } = usePlayback();
  const { fps } = core.state.composition;
  return (
    <div className={cn("flex items-center gap-2", className)} data-editor-transport="">
      <Button variant="ghost" size="icon" aria-label="To start" onClick={() => void core.seekTo(0)}>
        <SkipBack />
      </Button>
      <Button size="icon" aria-label={playing ? "Pause" : "Play"} onClick={() => void core.toggle()}>
        {playing ? <Pause /> : <Play />}
      </Button>
      <Slider
        className="flex-1"
        aria-label="Scrub"
        min={0}
        max={core.duration}
        step={1 / fps}
        value={[time]}
        onValueChange={([t]) => void core.seekTo(t ?? 0)}
      />
      <span className="w-28 text-right font-mono text-xs text-muted-foreground tabular-nums">
        {time.toFixed(2)} / {core.duration.toFixed(2)} s
      </span>
      <Select value={String(rate)} onValueChange={(v) => (core.playbackRate = Number(v))}>
        <SelectTrigger size="sm" aria-label="Speed" className="w-20">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {RATES.map((r) => (
            <SelectItem key={r} value={r}>
              {r}×
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Button
        variant="ghost"
        size="icon"
        aria-label={muted ? "Unmute" : "Mute"}
        aria-pressed={muted}
        onClick={() => (core.muted = !muted)}
      >
        {muted ? <VolumeX /> : <Volume2 />}
      </Button>
    </div>
  );
}
