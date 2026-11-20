import { Pause, Play, SkipBack } from "lucide-react";
import { useEffect, useState } from "react";

import { useCompositionTime, usePlayer } from "@uberscene/player";

import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";

function usePlaying(): boolean {
  const core = usePlayer();
  const [playing, setPlaying] = useState(core.isPlaying());
  useEffect(() => {
    const offs = (["play", "pause", "ended"] as const).map((type) =>
      core.addEventListener(type, () => setPlaying(core.isPlaying())),
    );
    return () => offs.forEach((off) => off());
  }, [core]);
  return playing;
}

export function Transport() {
  const core = usePlayer();
  const time = useCompositionTime();
  const playing = usePlaying();
  const { fps } = core.state.composition;
  return (
    <div className="flex items-center gap-2">
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
    </div>
  );
}
