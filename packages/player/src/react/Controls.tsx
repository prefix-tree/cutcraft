import { useEffect, useRef, useState, type CSSProperties } from "react";
import { useCompositionTime, usePlayer } from "./hooks";
import { timecode } from "../model/time";

const bar: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 8,
  padding: "6px 8px",
  background: "rgba(0,0,0,0.75)",
  color: "#eee",
  font: "12px system-ui, sans-serif",
  position: "absolute",
  left: 0,
  right: 0,
  bottom: 0,
  zIndex: 1000,
};
const button: CSSProperties = {
  background: "none",
  border: "1px solid #777",
  color: "inherit",
  borderRadius: 4,
  padding: "2px 8px",
  cursor: "pointer",
  font: "inherit",
};

/** Play/pause, scrubber, time readout, mute and rate. */
export function Controls() {
  const core = usePlayer();
  const time = useCompositionTime();
  const [playing, setPlaying] = useState(core.isPlaying());
  const [muted, setMuted] = useState(core.muted);
  const [rate, setRate] = useState(core.playbackRate);
  const resumeAfterScrub = useRef(false);
  useEffect(() => {
    const offs = [
      core.addEventListener("play", () => setPlaying(true)),
      core.addEventListener("pause", () => setPlaying(false)),
      core.addEventListener("ended", () => setPlaying(false)),
      core.addEventListener("volumechange", (e) => setMuted(e.muted)),
      core.addEventListener("ratechange", (e) => setRate(e.rate)),
    ];
    return () => offs.forEach((off) => off());
  }, [core]);
  const fps = core.state.composition.fps;
  return (
    <div style={bar} data-controls="">
      <button type="button" style={button} onClick={() => void core.toggle()} aria-label={playing ? "Pause" : "Play"}>
        {playing ? "❚❚" : "▶"}
      </button>
      <input
        type="range"
        min={0}
        max={core.duration}
        step={1 / fps}
        value={time}
        aria-label="Scrub"
        style={{ flex: 1 }}
        onPointerDown={() => {
          resumeAfterScrub.current = core.isPlaying();
          core.pause();
        }}
        onPointerUp={() => {
          if (resumeAfterScrub.current) void core.play();
          resumeAfterScrub.current = false;
        }}
        onChange={(e) => void core.seekTo(Number(e.target.value))}
      />
      <span style={{ fontVariantNumeric: "tabular-nums" }}>
        {timecode(time, fps)} / {timecode(core.duration, fps)}
      </span>
      <button
        type="button"
        style={button}
        onClick={() => {
          core.muted = !core.muted;
        }}
        aria-label={muted ? "Unmute" : "Mute"}
      >
        {muted ? "🔇" : "🔊"}
      </button>
      <select
        value={rate}
        onChange={(e) => {
          core.playbackRate = Number(e.target.value);
        }}
        aria-label="Speed"
        style={{ ...button, padding: 2 }}
      >
        {[0.5, 1, 1.5, 2].map((r) => (
          <option key={r} value={r}>
            {r}×
          </option>
        ))}
      </select>
    </div>
  );
}

export { timecode };
