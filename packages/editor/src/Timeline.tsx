import { type MouseEvent, useMemo } from "react";

import { useCompositionTime, usePlayer } from "@uberscene/player";
import { timelineRows } from "@uberscene/sdk";

import { useEditor } from "./context";
import { label } from "./Layers";

const pct = (x: number, of: number) => `${of > 0 ? (x / of) * 100 : 0}%`;

/**
 * One row per track, a bar per element, and the playhead. A bar click selects the element and seeks to its start;
 * a click on the row seeks there. Unstyled apart from positions: style `[data-editor-*]`.
 */
export function Timeline() {
  const { state, selection, select } = useEditor();
  const core = usePlayer();
  const time = useCompositionTime();
  const { composition, tracks, elements } = useMemo(() => timelineRows(state), [state]);
  const total = composition.duration;
  const seekAt = (e: MouseEvent<HTMLDivElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    if (r.width > 0) void core.seekTo(Math.min(Math.max((e.clientX - r.left) / r.width, 0), 1) * total);
  };
  return (
    <div data-editor-timeline="" style={{ position: "relative" }}>
      {tracks.map((t) => (
        // biome-ignore lint/a11y/useKeyWithClickEvents lint/a11y/noStaticElementInteractions: pointer seeking; Controls' scrubber is the keyboard path.
        <div key={t.id} data-editor-track={t.id} style={{ position: "relative" }} onClick={seekAt}>
          {elements
            .filter((e) => e.track === t.id)
            .map((row) => (
              <button
                key={row.id}
                type="button"
                data-editor-clip={row.id}
                data-kind={row.kind}
                aria-pressed={row.id === selection}
                title={label(row)}
                style={{ position: "absolute", left: pct(row.start, total), width: pct(row.duration, total) }}
                onClick={(e) => {
                  e.stopPropagation();
                  select(row.id);
                  void core.seekTo(row.start);
                }}
              >
                {label(row)}
              </button>
            ))}
        </div>
      ))}
      <div
        data-editor-playhead=""
        aria-hidden
        style={{ position: "absolute", top: 0, bottom: 0, left: pct(time, total), pointerEvents: "none" }}
      />
    </div>
  );
}
