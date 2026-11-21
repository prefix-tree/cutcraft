import { Lock } from "lucide-react";
import { type ReactNode, useEffect, useState } from "react";

import type { ActionResult } from "@uberscene/sdk";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

// Fields the inspector and the typography panel share: each writes on Enter or when it loses focus, not per key.

/** How a prop is written in the file: a literal the editor rewrites, bound to a value the file declares, or code. */
export type Access = "literal" | "bound" | "locked";

/** The reason an action was refused, or null when it went through. */
export const fail = (r: ActionResult | null) =>
  r && !r.ok ? (r.errors?.map((e) => e.message).join("; ") ?? "Refused") : null;

export function Group({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-2">
      <Separator />
      <h4 className="text-xs font-medium text-muted-foreground capitalize">{title}</h4>
      {children}
    </section>
  );
}

export function Row({ label, access = "literal", children }: { label: string; access?: Access; children: ReactNode }) {
  return (
    <div className="grid grid-cols-[6.5rem_1fr] items-center gap-2" data-editor-field={label}>
      <Label className="flex items-center gap-1 truncate text-xs font-normal text-muted-foreground">
        {label}
        {access !== "literal" && <LockMark access={access} />}
      </Label>
      {children}
    </div>
  );
}

/** The lock beside a label: the prop is written as code in the file, or bound to a value it declares. */
export function LockMark({ access }: { access: Access }) {
  const why = access === "locked" ? "Written as code in the file" : "Bound to a value the file declares";
  return (
    <Lock className="size-3 shrink-0" aria-label={why}>
      <title>{why}</title>
    </Lock>
  );
}

/** A number written on Enter or when the field loses focus; Escape puts the value back. */
export function NumberField({
  name,
  value,
  step,
  min,
  max,
  disabled,
  onCommit,
}: {
  name?: string | undefined;
  value: number | undefined;
  step?: number | undefined;
  min?: number | undefined;
  max?: number | undefined;
  disabled?: boolean | undefined;
  onCommit: (v: number) => void;
}) {
  const [draft, setDraft] = useState(value === undefined ? "" : String(value));
  useEffect(() => setDraft(value === undefined ? "" : String(value)), [value]);
  const commit = () => {
    const n = Number(draft);
    if (draft.trim() === "" || !Number.isFinite(n) || n === value)
      return setDraft(value === undefined ? "" : String(value));
    onCommit(n);
  };
  return (
    <Input
      type="number"
      aria-label={name}
      className="h-8 font-mono text-xs"
      value={draft}
      step={step ?? "any"}
      min={min}
      max={max}
      disabled={disabled}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === "Enter") commit();
        if (e.key === "Escape") setDraft(value === undefined ? "" : String(value));
      }}
    />
  );
}

/** Text written on Enter (Cmd/Ctrl+Enter when multiline) or when the field loses focus. */
export function TextField({
  label,
  value,
  multiline,
  swatch,
  disabled,
  onCommit,
}: {
  label: string;
  value: string;
  multiline?: boolean;
  swatch?: boolean;
  disabled?: boolean;
  onCommit: (v: string) => void;
}) {
  const [draft, setDraft] = useState(value);
  useEffect(() => setDraft(value), [value]);
  const commit = () => {
    if (draft !== value) onCommit(draft);
  };
  if (multiline)
    return (
      <Textarea
        aria-label={label}
        value={draft}
        disabled={disabled}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) commit();
        }}
      />
    );
  return (
    <div className="flex items-center gap-2">
      {swatch && (
        <span
          aria-hidden
          className="size-5 shrink-0 rounded border"
          style={{ background: draft.startsWith("$") ? undefined : draft }}
        />
      )}
      <Input
        aria-label={label}
        className="h-8 text-xs"
        value={draft}
        disabled={disabled}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === "Enter") commit();
          if (e.key === "Escape") setDraft(value);
        }}
      />
    </div>
  );
}

/**
 * A colour: a swatch that opens the system picker, beside the value as text, which also takes a theme token such as
 * `$primary`. `shown` is what it looks like now (a token resolved, or the default), for the swatch and the placeholder.
 * A pick from the picker is written once the pointer settles, not on every step of the drag.
 */
export function ColorField({
  label,
  value,
  shown,
  disabled,
  onCommit,
}: {
  label: string;
  value: string | undefined;
  shown: string | undefined;
  disabled?: boolean | undefined;
  onCommit: (v: string | undefined) => void;
}) {
  const [draft, setDraft] = useState(value ?? "");
  useEffect(() => setDraft(value ?? ""), [value]);
  const [timer, setTimer] = useState<ReturnType<typeof setTimeout> | null>(null);
  const commit = (next: string) => {
    const v = next.trim() === "" ? undefined : next.trim();
    if (v !== value) onCommit(v);
  };
  const swatch = /^#[0-9a-f]{6}$/i.test(shown ?? "") ? (shown as string) : "#000000";
  return (
    <div className="flex items-center gap-2">
      <label
        className={cn(
          "relative size-8 shrink-0 cursor-pointer overflow-hidden rounded-md border",
          disabled && "pointer-events-none opacity-50",
        )}
        style={{ background: shown }}
      >
        <span className="sr-only">{`${label} picker`}</span>
        <input
          type="color"
          className="absolute inset-0 cursor-pointer opacity-0"
          value={swatch}
          disabled={disabled}
          onChange={(e) => {
            const next = e.target.value;
            setDraft(next);
            if (timer) clearTimeout(timer);
            setTimer(setTimeout(() => commit(next), 300));
          }}
        />
      </label>
      <Input
        aria-label={label}
        className="h-8 font-mono text-xs"
        value={draft}
        placeholder={shown ?? "None"}
        disabled={disabled}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={() => commit(draft)}
        onKeyDown={(e) => {
          if (e.key === "Enter") commit(draft);
          if (e.key === "Escape") setDraft(value ?? "");
        }}
      />
    </div>
  );
}
