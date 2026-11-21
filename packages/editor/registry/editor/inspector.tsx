import { Redo2, Trash2, Undo2 } from "lucide-react";
import { useState } from "react";

import { useEdit, useEditor, useSelection } from "@uberscene/editor";
import { knobsOf, SCHEMAS_BY_KIND } from "@uberscene/kit/schema";
import type { ActionInput } from "@uberscene/sdk";

import { type Access, fail, Group, NumberField, Row, TextField } from "./fields";
import { Typography } from "./typography";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";

/** Props the inspector leaves to other controls: timing (the timeline and the fields at the top), ids, children. */
const SKIP = new Set([
  "id",
  "start",
  "duration",
  "end",
  "in",
  "out",
  "anchor",
  "at",
  "offset",
  "after",
  "children",
  "text",
]);
/** Kinds `element/update` writes; any other element's props go through `source/setProp`. */
const UPDATABLE = new Set(["title", "shape", "svg", "sticker", "adjustment", "nested", "layer"]);

type Knob = ReturnType<typeof knobsOf>[number];
type Scalar = string | number | boolean;

const isScalar = (v: unknown): v is Scalar => ["string", "number", "boolean"].includes(typeof v);
const isObject = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null && !Array.isArray(v);

/**
 * The selected element: its timing, its text, and every prop its schema lists, as fields. A change is one undoable
 * edit. Props written as an expression in the file are locked, and props bound to a value the file declares are shown
 * but not written; the field says which.
 */
export function Inspector({ className }: { className?: string }) {
  const { state } = useEditor();
  const [selected, select] = useSelection();
  const edit = useEdit();
  const [error, setError] = useState<string | null>(null);
  const run = (input: ActionInput) => setError(fail(edit.execute(input)));
  const item = selected ? state.items.get(selected) : undefined;
  const raw = (selected && state.tree.byId.get(selected)?.props) || {};
  const access = (prop: string): Access =>
    item?.lockedProps.includes(prop) ? "locked" : item && prop in item.boundProps ? "bound" : "literal";

  const writeProp = (key: string, value: unknown) => {
    if (!item) return;
    run(
      (key === "box"
        ? { type: "box/update", params: { id: item.id, box: value } }
        : UPDATABLE.has(item.kind)
          ? { type: "element/update", params: { id: item.id, props: { [key]: value } } }
          : { type: "source/setProp", params: { id: item.id, prop: key, value } }) as ActionInput,
    );
  };

  return (
    <div className={cn("flex h-full min-h-0 flex-col", className)} data-editor-inspector="">
      <div className="flex items-center gap-1 border-b p-2">
        <Button variant="ghost" size="sm" disabled={!edit.canUndo} onClick={() => setError(fail(edit.undo()))}>
          <Undo2 /> Undo
        </Button>
        <Button variant="ghost" size="sm" disabled={!edit.canRedo} onClick={() => setError(fail(edit.redo()))}>
          <Redo2 /> Redo
        </Button>
        {item && (
          <Button
            variant="ghost"
            size="icon"
            className="ml-auto text-destructive"
            aria-label="Delete"
            onClick={() => {
              run({ type: "element/remove", params: { id: item.id } });
              select(null);
            }}
          >
            <Trash2 />
          </Button>
        )}
      </div>
      <ScrollArea className="min-h-0 flex-1">
        {item ? (
          <div className="flex flex-col gap-4 p-3 text-sm">
            <div className="flex items-center gap-2">
              <Badge variant="secondary">{item.kind}</Badge>
              <span className="truncate font-mono text-xs text-muted-foreground">{item.id}</span>
            </div>
            <Group title="Timing">
              <Row label="Start" access={access("start")}>
                <NumberField
                  value={round(item.start)}
                  step={0.1}
                  disabled={access("start") !== "literal"}
                  onCommit={(v) =>
                    run({ type: "clip/move", params: { id: item.id, place: { start: Math.max(0, v) } } })
                  }
                />
              </Row>
              <Row label="Duration" access={access("duration")}>
                <NumberField
                  value={round(item.duration)}
                  step={0.1}
                  disabled={access("duration") !== "literal"}
                  onCommit={(v) =>
                    run({
                      type: "clip/trim",
                      params: { id: item.id, edge: "out", value: round(item.start + Math.max(0.05, v)) },
                    })
                  }
                />
              </Row>
            </Group>
            {item.kind === "title" && (
              <Group title="Text">
                <TextField
                  multiline
                  label="Text"
                  value={state.tree.byId.get(item.id)?.text ?? ""}
                  disabled={access("text") !== "literal"}
                  onCommit={(text) => run({ type: "text/setContent", params: { id: item.id, text } })}
                />
              </Group>
            )}
            {knobsOf(SCHEMAS_BY_KIND[item.kind], raw)
              .filter((k) => !SKIP.has(k.key))
              .map((k) => {
                // How text looks has a panel of its own, every property shown whether the file sets it or not.
                if (k.key === "style" && (item.kind === "title" || item.kind === "captions"))
                  return <Typography key={k.key} id={item.id} onError={setError} />;
                const value = raw[k.key] ?? k.value;
                // An object prop (style, box) is shown one level down, a field per key it holds.
                if (isObject(value))
                  return (
                    <Group key={k.key} title={k.description ?? k.key}>
                      {Object.entries(value)
                        .filter(([, v]) => isScalar(v))
                        .map(([sub, v]) => {
                          const a = access(k.key) === "literal" ? access(`${k.key}.${sub}`) : access(k.key);
                          return (
                            <Row key={sub} label={sub} access={a}>
                              <ScalarField
                                name={`${k.key}.${sub}`}
                                value={v as Scalar}
                                disabled={a !== "literal"}
                                onCommit={(next) =>
                                  writeProp(k.key, k.key === "box" ? { [sub]: next } : { ...value, [sub]: next })
                                }
                              />
                            </Row>
                          );
                        })}
                    </Group>
                  );
                if (k.kind === "other" && !isScalar(value)) return null;
                return (
                  <Row key={k.key} label={k.description ?? k.key} access={access(k.key)}>
                    <KnobField
                      knob={k}
                      value={value}
                      disabled={access(k.key) !== "literal"}
                      onCommit={(v) => writeProp(k.key, v)}
                    />
                  </Row>
                );
              })}
            {error && (
              <p className="text-destructive" role="alert">
                {error}
              </p>
            )}
          </div>
        ) : (
          <p className="p-3 text-sm text-muted-foreground">Select an element in the layers or on the timeline.</p>
        )}
      </ScrollArea>
    </div>
  );
}

const round = (n: number) => Math.round(n * 1000) / 1000;

function KnobField({
  knob,
  value,
  disabled,
  onCommit,
}: {
  knob: Knob;
  value: unknown;
  disabled: boolean;
  onCommit: (v: Scalar) => void;
}) {
  if (knob.kind === "choice" && knob.options)
    return (
      <Select
        value={value === undefined ? undefined : String(value)}
        disabled={disabled}
        onValueChange={(v) => {
          const option = knob.options?.find((o) => String(o) === v);
          if (option !== undefined) onCommit(option);
        }}
      >
        <SelectTrigger size="sm" aria-label={knob.key}>
          <SelectValue placeholder="Default" />
        </SelectTrigger>
        <SelectContent>
          {knob.options.map((o) => (
            <SelectItem key={String(o)} value={String(o)}>
              {String(o)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    );
  if (knob.kind === "boolean")
    return <Switch aria-label={knob.key} checked={value === true} disabled={disabled} onCheckedChange={onCommit} />;
  if (knob.kind === "number")
    return (
      <NumberField
        name={knob.key}
        value={typeof value === "number" ? value : undefined}
        min={knob.min}
        max={knob.max}
        disabled={disabled}
        onCommit={onCommit}
      />
    );
  return (
    <ScalarField
      name={knob.key}
      value={isScalar(value) ? value : ""}
      color={knob.kind === "color"}
      disabled={disabled}
      onCommit={onCommit}
    />
  );
}

/** A field for a value whose type is known only from the value itself, as inside an object prop. */
function ScalarField({
  name,
  value,
  color,
  disabled,
  onCommit,
}: {
  name: string;
  value: Scalar;
  color?: boolean;
  disabled: boolean;
  onCommit: (v: Scalar) => void;
}) {
  if (typeof value === "number")
    return <NumberField name={name} value={value} disabled={disabled} onCommit={onCommit} />;
  if (typeof value === "boolean")
    return <Switch aria-label={name} checked={value} disabled={disabled} onCheckedChange={onCommit} />;
  const swatch = color || /colou?r|background|fill/i.test(name);
  return <TextField label={name} value={value} swatch={swatch} disabled={disabled} onCommit={onCommit} />;
}
