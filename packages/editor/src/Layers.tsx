import { useMemo } from "react";

import { type ElementRow, timelineRows } from "@uberscene/sdk";

import { useEditor } from "./context";

export const label = (row: ElementRow): string => row.label ?? row.text ?? row.id;

/** Every element, grouped by track, as buttons that select it. Unstyled: style `[data-editor-*]`. */
export function Layers() {
  const { state, selection, select } = useEditor();
  const groups = useMemo(() => {
    const { tracks, elements } = timelineRows(state);
    const ids = new Set(tracks.map((t) => t.id));
    const byTrack = tracks.map((t) => ({ id: t.id, rows: elements.filter((e) => e.track === t.id) }));
    const rest = elements.filter((e) => e.track === null || !ids.has(e.track));
    return rest.length > 0 ? [...byTrack, { id: null, rows: rest }] : byTrack;
  }, [state]);
  return (
    <nav aria-label="Layers" data-editor-layers="">
      {groups.map((g) => (
        <section key={g.id ?? ""} data-editor-track={g.id ?? ""} aria-label={g.id ?? "Other"}>
          <h3>{g.id ?? "Other"}</h3>
          <ul>
            {g.rows.map((row) => (
              <li key={row.id}>
                <button
                  type="button"
                  data-editor-layer={row.id}
                  data-kind={row.kind}
                  aria-pressed={row.id === selection}
                  onClick={() => select(row.id)}
                >
                  {label(row)}
                </button>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </nav>
  );
}
