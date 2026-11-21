import type { MouseEvent } from "react";

import { useSelection } from "@uberscene/editor";
import { useCompositionTime, usePlayer } from "@uberscene/player";

import { useRows } from "./use-rows";
import { cn } from "@/lib/utils";

const pct = (x: number, of: number) => `${of > 0 ? (x / of) * 100 : 0}%`;

export function Timeline() {
  const { composition, byTrack } = useRows();
  const [selected, select] = useSelection();
  const core = usePlayer();
  const time = useCompositionTime();
  const total = composition.duration;
  const seekAt = (e: MouseEvent<HTMLDivElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    void core.seekTo(Math.min(Math.max((e.clientX - r.left) / r.width, 0), 1) * total);
  };
  return (
    <div className="grid grid-cols-[6rem_1fr] gap-y-1 p-3 text-xs">
      {byTrack.map(({ track, rows }) => (
        <div key={track.id} className="contents">
          <div className="flex items-center text-muted-foreground">{track.id}</div>
          {/* biome-ignore lint/a11y/useKeyWithClickEvents lint/a11y/noStaticElementInteractions: pointer seeking; the transport slider is the keyboard path. */}
          <div className="relative h-9 rounded-md bg-muted/40" onClick={seekAt}>
            {rows.map((row) => (
              <button
                key={row.id}
                type="button"
                aria-pressed={row.id === selected}
                title={row.text ?? row.id}
                className={cn(
                  "absolute inset-y-1 truncate rounded-sm border px-2 text-left transition-colors",
                  row.id === selected
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border bg-secondary hover:bg-accent",
                )}
                style={{ left: pct(row.start, total), width: pct(row.duration, total) }}
                onClick={(e) => {
                  e.stopPropagation();
                  select(row.id);
                  void core.seekTo(row.start);
                }}
              >
                {row.text ?? row.id}
              </button>
            ))}
            <div
              aria-hidden
              className="pointer-events-none absolute inset-y-0 w-px bg-destructive"
              style={{ left: pct(time, total) }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}
