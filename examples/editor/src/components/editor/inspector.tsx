import { ChevronLeft, ChevronRight, Redo2, Trash2, Undo2 } from "lucide-react";
import { useState } from "react";

import { useEdit, useSelection } from "@uberscene/editor";

import { useRows } from "./use-rows";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

/** What the editor's hooks give a custom block: the selection, the rows, and undoable edits. */
export function Inspector() {
  const [selected, select] = useSelection();
  const edit = useEdit();
  const { elements } = useRows();
  const [error, setError] = useState<string | null>(null);
  const row = elements.find((e) => e.id === selected);
  const run = (result: { ok: boolean; errors?: readonly { message: string }[] } | null) =>
    setError(result && !result.ok ? (result.errors?.map((e) => e.message).join("; ") ?? "Refused") : null);
  const nudge = (by: number) =>
    row &&
    run(edit.execute({ type: "clip/move", params: { id: row.id, place: { start: Math.max(0, row.start + by) } } }));
  return (
    <div className="flex h-full flex-col gap-3 p-3">
      <div className="flex gap-1">
        <Button variant="outline" size="sm" disabled={!edit.canUndo} onClick={() => run(edit.undo())}>
          <Undo2 /> Undo
        </Button>
        <Button variant="outline" size="sm" disabled={!edit.canRedo} onClick={() => run(edit.redo())}>
          <Redo2 /> Redo
        </Button>
      </div>
      <Separator />
      {row ? (
        <Card size="sm">
          <CardHeader>
            <CardTitle className="truncate">{row.text ?? row.id}</CardTitle>
            <CardDescription className="flex gap-1">
              <Badge variant="secondary">{row.kind}</Badge>
              <Badge variant="outline">{row.id}</Badge>
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-3 text-sm">
            <dl className="grid grid-cols-2 gap-1 text-muted-foreground">
              <dt>Start</dt>
              <dd className="text-right font-mono text-foreground">{row.start.toFixed(2)} s</dd>
              <dt>Duration</dt>
              <dd className="text-right font-mono text-foreground">{row.duration.toFixed(2)} s</dd>
            </dl>
            <div className="flex gap-1">
              <Button variant="outline" size="sm" onClick={() => nudge(-0.5)}>
                <ChevronLeft /> 0.5 s
              </Button>
              <Button variant="outline" size="sm" onClick={() => nudge(0.5)}>
                0.5 s <ChevronRight />
              </Button>
              <Button
                variant="destructive"
                size="sm"
                className="ml-auto"
                aria-label="Remove"
                onClick={() => {
                  run(edit.execute({ type: "element/remove", params: { id: row.id } }));
                  select(null);
                }}
              >
                <Trash2 />
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <p className="text-sm text-muted-foreground">Select a layer to inspect it.</p>
      )}
      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
}
