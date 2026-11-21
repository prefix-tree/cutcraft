import { Lock, ZoomIn } from "lucide-react";
import { type PointerEvent as ReactPointerEvent, useRef, useState } from "react";

import { useEdit, useEditor, useSelection } from "@uberscene/editor";
import { useCompositionTime, usePlayer } from "@uberscene/player";
import { affordances, type ElementRow } from "@uberscene/sdk";

import { useRows } from "./use-rows";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Slider } from "@/components/ui/slider";
import { cn } from "@/lib/utils";

type Grab = "move" | "in" | "out";

interface Drag {
  readonly id: string;
  readonly grab: Grab;
  readonly x: number;
  /** Seconds the pointer has travelled, snapped. */
  readonly delta: number;
}

/** Where a drag of `delta` seconds by one grip puts the element, never shorter than a frame nor before 0. */
function placed(row: ElementRow, grab: Grab, delta: number, frame: number): { start: number; duration: number } {
  if (grab === "move") return { start: Math.max(0, row.start + delta), duration: row.duration };
  if (grab === "in") {
    const shift = Math.min(Math.max(delta, -row.start), row.duration - frame);
    return { start: row.start + shift, duration: row.duration - shift };
  }
  return { start: row.start, duration: Math.max(frame, row.duration + delta) };
}

/** The pixels a pointer must travel before a press on a bar becomes a drag rather than a click. */
const SLOP = 3;
const EDGE = 6;

/**
 * A row per track and a bar per element. Click a bar to select it and seek to it; drag it to move it; drag either end
 * to trim it. Each drag is one undoable edit, run when the pointer is let go.
 */
export function Timeline({ className }: { className?: string }) {
  const { state } = useEditor();
  const { composition, byTrack } = useRows();
  const [selected, select] = useSelection();
  const edit = useEdit();
  const core = usePlayer();
  const time = useCompositionTime();
  const [zoom, setZoom] = useState(80);
  const [drag, setDrag] = useState<Drag | null>(null);
  const [error, setError] = useState<string | null>(null);
  const pressed = useRef<{ id: string; grab: Grab; x: number; moved: boolean } | null>(null);
  const total = Math.max(composition.duration, 1);
  const width = total * zoom;
  const frame = 1 / composition.fps;
  const snap = (seconds: number) => Math.round(seconds / frame) * frame;

  const can = (row: ElementRow, action: string) =>
    (affordances(state, row.id)?.actions as readonly string[] | undefined)?.includes(action) ?? false;
  const locked = (row: ElementRow) => byTrack.find((t) => t.track.id === row.track)?.track.locked ?? false;

  /** Where a bar is drawn: where it is, or where the drag in progress would put it. */
  const shown = (row: ElementRow) =>
    drag?.id === row.id ? placed(row, drag.grab, drag.delta, frame) : { start: row.start, duration: row.duration };

  const commit = (row: ElementRow, grab: Grab, delta: number) => {
    if (delta === 0) return;
    const r = (n: number) => Math.round(n * 1000) / 1000;
    const { start, duration } = placed(row, grab, delta, frame);
    const speed = row.speed ?? 1;
    const action =
      grab === "move"
        ? { type: "clip/move", params: { id: row.id, place: { start: r(start) } } }
        : row.asset !== undefined && row.in !== undefined && row.out !== undefined
          ? // A footage clip's edges are its source in and out, in the asset's own seconds.
            {
              type: "clip/trim",
              params: {
                id: row.id,
                edge: grab,
                value: r(
                  grab === "in" ? row.in + (start - row.start) * speed : row.out + (duration - row.duration) * speed,
                ),
              },
            }
          : // Anything else: the timeline time of that edge.
            {
              type: "clip/trim",
              params: { id: row.id, edge: grab, value: r(grab === "in" ? start : start + duration) },
            };
    const result = edit.execute(action as Parameters<typeof edit.execute>[0]);
    setError(result.ok ? null : (result.errors?.map((e) => e.message).join("; ") ?? "Refused"));
  };

  const onDown = (row: ElementRow, e: ReactPointerEvent<HTMLButtonElement>) => {
    if (e.button !== 0) return;
    const r = e.currentTarget.getBoundingClientRect();
    const grab: Grab = e.clientX - r.left < EDGE ? "in" : r.right - e.clientX < EDGE ? "out" : "move";
    pressed.current = { id: row.id, grab, x: e.clientX, moved: false };
    e.currentTarget.setPointerCapture(e.pointerId);
  };
  const onMove = (row: ElementRow, e: ReactPointerEvent<HTMLButtonElement>) => {
    const p = pressed.current;
    if (!p || p.id !== row.id) return;
    const dx = e.clientX - p.x;
    if (!p.moved && Math.abs(dx) < SLOP) return;
    const allowed =
      !locked(row) && (p.grab === "move" ? can(row, "clip/move") : can(row, "clip/trim") || can(row, "clip/move"));
    if (!allowed) return;
    p.moved = true;
    setDrag({ id: row.id, grab: p.grab, x: p.x, delta: snap(dx / zoom) });
  };
  const onUp = (row: ElementRow) => {
    const p = pressed.current;
    pressed.current = null;
    if (!p) return;
    if (!p.moved) {
      select(row.id);
      void core.seekTo(row.start);
      return;
    }
    const d = drag?.delta ?? 0;
    setDrag(null);
    select(row.id);
    commit(row, p.grab, d);
  };

  const seekAt = (e: ReactPointerEvent<HTMLDivElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    void core.seekTo(Math.min(Math.max((e.clientX - r.left) / zoom, 0), total));
  };

  const ticks = Math.ceil(total);
  return (
    <div className={cn("flex h-full min-h-0 flex-col", className)} data-editor-timeline="">
      <div className="flex items-center gap-3 border-b px-3 py-1.5 text-xs text-muted-foreground">
        <span className="font-mono tabular-nums">{time.toFixed(2)} s</span>
        {error && (
          <span className="truncate text-destructive" role="alert">
            {error}
          </span>
        )}
        <div className="ml-auto flex w-40 items-center gap-2">
          <ZoomIn className="size-3.5 shrink-0" />
          <Slider
            aria-label="Zoom"
            min={20}
            max={300}
            step={5}
            value={[zoom]}
            onValueChange={([z]) => setZoom(z ?? 80)}
          />
        </div>
      </div>
      <ScrollArea className="min-h-0 flex-1">
        <div className="grid grid-cols-[7rem_auto] text-xs">
          <div className="sticky left-0 z-10 border-r border-b bg-background" />
          <div className="relative h-6 cursor-pointer border-b" style={{ width }} onPointerDown={seekAt}>
            {Array.from({ length: ticks + 1 }, (_, s) => s).map((s) => (
              <span
                key={s}
                className="absolute top-0 h-full border-l pl-1 text-[10px] text-muted-foreground"
                style={{ left: s * zoom }}
              >
                {s}s
              </span>
            ))}
          </div>
          {byTrack.map(({ track, rows }) => (
            <div key={track.id} className="contents" data-editor-track={track.id}>
              <div className="sticky left-0 z-10 flex items-center gap-1.5 truncate border-r bg-background px-3 text-muted-foreground">
                {track.locked && <Lock className="size-3" aria-label="Locked" />}
                <span className="truncate">{track.id}</span>
              </div>
              <div className="relative h-10 border-b" style={{ width }}>
                {rows.map((row) => {
                  const { start, duration } = shown(row);
                  const active = row.id === selected;
                  return (
                    <button
                      key={row.id}
                      type="button"
                      data-editor-bar={row.id}
                      aria-pressed={active}
                      title={row.text ?? row.id}
                      className={cn(
                        "group absolute inset-y-1.5 touch-none truncate rounded-md border px-2 text-left select-none",
                        active
                          ? "border-primary bg-primary text-primary-foreground"
                          : "border-border bg-secondary text-secondary-foreground hover:bg-accent",
                        drag?.id === row.id && "opacity-80 ring-2 ring-ring",
                      )}
                      style={{ left: start * zoom, width: Math.max(duration * zoom, 4) }}
                      onPointerDown={(e) => onDown(row, e)}
                      onPointerMove={(e) => onMove(row, e)}
                      onPointerUp={() => onUp(row)}
                      onPointerCancel={() => {
                        pressed.current = null;
                        setDrag(null);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") select(row.id);
                      }}
                    >
                      <span
                        aria-hidden
                        data-editor-edge="in"
                        className="absolute inset-y-0 left-0 w-1.5 cursor-ew-resize rounded-l-md group-hover:bg-foreground/20"
                      />
                      <span className="pointer-events-none">{row.text ?? row.id}</span>
                      <span
                        aria-hidden
                        data-editor-edge="out"
                        className="absolute inset-y-0 right-0 w-1.5 cursor-ew-resize rounded-r-md group-hover:bg-foreground/20"
                      />
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
        <div
          aria-hidden
          data-editor-playhead=""
          className="pointer-events-none absolute inset-y-0 z-20 w-px bg-destructive"
          style={{ left: `calc(7rem + ${time * zoom}px)` }}
        />
        <ScrollBar orientation="horizontal" />
      </ScrollArea>
    </div>
  );
}
