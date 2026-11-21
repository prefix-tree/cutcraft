import {
  AlignCenter,
  AlignJustify,
  AlignLeft,
  AlignRight,
  AlignVerticalJustifyCenter,
  AlignVerticalJustifyEnd,
  AlignVerticalJustifyStart,
  Italic,
  Strikethrough,
  Underline,
} from "lucide-react";
import type { ReactNode } from "react";

import { useEdit, useEditor } from "@uberscene/editor";
import { FONT_CATALOG, findFont } from "@uberscene/kit/schema";
import type { ActionInput } from "@uberscene/sdk";

import { type Access, ColorField, fail, Group, LockMark, NumberField, Row } from "./fields";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Toggle } from "@/components/ui/toggle";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";

type Look = Record<string, unknown>;
type Kind = "title" | "captions";

/** What each kind's `style` holds, in the order a designer reads a text panel. */
const KEYS: Record<Kind, ReadonlySet<string>> = {
  title: new Set([
    "preset",
    "font",
    "weight",
    "size",
    "lineHeight",
    "letterSpacing",
    "align",
    "valign",
    "italic",
    "decoration",
    "color",
    "background",
    "stroke",
    "shadow",
  ]),
  captions: new Set([
    "preset",
    "font",
    "weight",
    "size",
    "align",
    "color",
    "background",
    "stroke",
    "shadow",
    "highlight",
    "highlightBox",
    "upcoming",
  ]),
};
const WEIGHTS = [100, 200, 300, 400, 500, 600, 700, 800, 900];
const WEIGHT_NAMES: Record<number, string> = {
  100: "Thin",
  200: "Extra light",
  300: "Light",
  400: "Regular",
  500: "Medium",
  600: "Semibold",
  700: "Bold",
  800: "Extra bold",
  900: "Black",
};
const isLook = (v: unknown): v is Look => typeof v === "object" && v !== null && !Array.isArray(v);
const weightOf = (w: unknown): number => (w === "bold" ? 700 : w === "normal" ? 400 : typeof w === "number" ? w : 400);

/**
 * How a title's or the captions' text looks, as a design tool's text panel shows it: every property, set in the file
 * or not. Each field shows the value the text has now (its preset and the defaults included) and writes only the one
 * key it changes into the element's `style`, so a preset named there keeps applying to the rest.
 */
export function Typography({ id, onError }: { id: string; onError: (message: string | null) => void }) {
  const { state } = useEditor();
  const edit = useEdit();
  const item = state.items.get(id);
  if (!item || (item.kind !== "title" && item.kind !== "captions")) return null;
  const kind = item.kind as Kind;
  const has = (key: string) => KEYS[kind].has(key);
  // What the file writes (a preset name alone, an object, or nothing) and what the text looks like now.
  const rawStyle = state.tree.byId.get(id)?.props.style;
  const own: Look = typeof rawStyle === "string" ? { preset: rawStyle } : isLook(rawStyle) ? rawStyle : {};
  const now: Look = isLook(item.props.style) ? item.props.style : {};
  const access = (key: string): Access => {
    for (const path of ["style", `style.${key}`]) {
      if (item.lockedProps.includes(path)) return "locked";
      if (path in item.boundProps) return "bound";
    }
    return "literal";
  };
  const off = (key: string) => access(key) !== "literal";

  const write = (key: string, value: unknown) => {
    const next: Look = { ...own };
    if (value === undefined || value === "") delete next[key];
    else next[key] = value;
    const style = Object.keys(next).length === 0 ? undefined : next;
    const action =
      kind === "title"
        ? { type: "element/update", params: { id, props: { style: style ?? {} } } }
        : { type: "caption/setStyle", params: { captionsId: id, style } };
    onError(fail(edit.execute(action as ActionInput)));
  };
  /** A colour as it shows: a theme token resolved through the theme. */
  const shown = (v: unknown): string | undefined =>
    typeof v !== "string" ? undefined : v.startsWith("$") ? String(state.theme.tokens[v.slice(1)] ?? v) : v;

  const presets = Object.keys(state.theme.styles[kind === "title" ? "title" : "captions"] ?? {});
  const family = String(now.font ?? "Inter");
  const families = [...new Set([family, ...state.fonts.map((f) => f.family), ...FONT_CATALOG.map((f) => f.family)])];
  const weights = findFont(family)?.weights ?? WEIGHTS;
  const weight = weightOf(now.weight);
  const stroke = isLook(now.stroke) ? now.stroke : {};
  const shadow = isLook(now.shadow) ? now.shadow : {};
  const ownStroke = isLook(own.stroke) ? own.stroke : {};
  const ownShadow = isLook(own.shadow) ? own.shadow : {};

  return (
    <Group title="Typography">
      <div className="flex flex-col gap-2" data-editor-typography="">
        {presets.length > 0 && (
          <Row label="Preset" access={access("preset")}>
            <Select
              value={typeof own.preset === "string" ? own.preset : "none"}
              disabled={off("preset")}
              onValueChange={(v) => write("preset", v === "none" ? undefined : v)}
            >
              <SelectTrigger size="sm" aria-label="Preset" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">None</SelectItem>
                {presets.map((p) => (
                  <SelectItem key={p} value={p}>
                    {p}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Row>
        )}
        <Row label="Font" access={access("font")}>
          <Select value={family} disabled={off("font")} onValueChange={(v) => write("font", v)}>
            <SelectTrigger size="sm" aria-label="Font" className="w-full" style={{ fontFamily: family }}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {families.map((f) => (
                <SelectItem key={f} value={f} style={{ fontFamily: f }}>
                  {f}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Row>
        <Pair>
          <Cell label="Weight" access={access("weight")}>
            <Select value={String(weight)} disabled={off("weight")} onValueChange={(v) => write("weight", Number(v))}>
              <SelectTrigger size="sm" aria-label="Weight" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {[...new Set([...weights, weight])]
                  .sort((a, b) => a - b)
                  .map((w) => (
                    <SelectItem key={w} value={String(w)}>
                      {WEIGHT_NAMES[w] ?? w} <span className="text-muted-foreground">{w}</span>
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </Cell>
          <Cell label="Size" access={access("size")}>
            <NumberField
              name="Size"
              value={typeof now.size === "number" ? now.size : undefined}
              min={1}
              max={1000}
              disabled={off("size")}
              onCommit={(v) => write("size", v)}
            />
          </Cell>
        </Pair>
        {has("lineHeight") && (
          <Pair>
            <Cell label="Line height" access={access("lineHeight")}>
              <NumberField
                name="Line height"
                value={typeof now.lineHeight === "number" ? now.lineHeight : undefined}
                step={0.05}
                min={0.1}
                max={10}
                disabled={off("lineHeight")}
                onCommit={(v) => write("lineHeight", v)}
              />
            </Cell>
            <Cell label="Letter spacing" access={access("letterSpacing")}>
              <NumberField
                name="Letter spacing"
                value={typeof now.letterSpacing === "number" ? now.letterSpacing : undefined}
                step={0.5}
                min={-100}
                max={100}
                disabled={off("letterSpacing")}
                onCommit={(v) => write("letterSpacing", v)}
              />
            </Cell>
          </Pair>
        )}
        <Row label="Align" access={access("align")}>
          <div className="flex items-center gap-1">
            <ToggleGroup
              type="single"
              variant="outline"
              size="sm"
              aria-label="Align"
              value={String(now.align ?? "center")}
              disabled={off("align")}
              onValueChange={(v) => v && write("align", v)}
            >
              <ToggleGroupItem value="left" aria-label="Align left">
                <AlignLeft />
              </ToggleGroupItem>
              <ToggleGroupItem value="center" aria-label="Align center">
                <AlignCenter />
              </ToggleGroupItem>
              <ToggleGroupItem value="right" aria-label="Align right">
                <AlignRight />
              </ToggleGroupItem>
              {kind === "title" && (
                <ToggleGroupItem value="justify" aria-label="Justify">
                  <AlignJustify />
                </ToggleGroupItem>
              )}
            </ToggleGroup>
          </div>
        </Row>
        {has("valign") && (
          <Row label="Vertical" access={access("valign")}>
            <ToggleGroup
              type="single"
              variant="outline"
              size="sm"
              aria-label="Vertical align"
              value={String(now.valign ?? "middle")}
              disabled={off("valign")}
              onValueChange={(v) => v && write("valign", v)}
            >
              <ToggleGroupItem value="top" aria-label="Top">
                <AlignVerticalJustifyStart />
              </ToggleGroupItem>
              <ToggleGroupItem value="middle" aria-label="Middle">
                <AlignVerticalJustifyCenter />
              </ToggleGroupItem>
              <ToggleGroupItem value="bottom" aria-label="Bottom">
                <AlignVerticalJustifyEnd />
              </ToggleGroupItem>
            </ToggleGroup>
          </Row>
        )}
        {has("decoration") && (
          <Row label="Decoration" access={access("decoration")}>
            <div className="flex items-center gap-1">
              <Toggle
                variant="outline"
                size="sm"
                aria-label="Italic"
                pressed={now.italic === true}
                disabled={off("italic")}
                onPressedChange={(p) => write("italic", p ? true : undefined)}
              >
                <Italic />
              </Toggle>
              <ToggleGroup
                type="single"
                variant="outline"
                size="sm"
                aria-label="Decoration"
                value={now.decoration && now.decoration !== "none" ? String(now.decoration) : ""}
                disabled={off("decoration")}
                onValueChange={(v) => write("decoration", v || undefined)}
              >
                <ToggleGroupItem value="underline" aria-label="Underline">
                  <Underline />
                </ToggleGroupItem>
                <ToggleGroupItem value="lineThrough" aria-label="Strikethrough">
                  <Strikethrough />
                </ToggleGroupItem>
                <ToggleGroupItem value="overline" aria-label="Overline">
                  <span className="text-xs leading-none font-semibold overline">O</span>
                </ToggleGroupItem>
              </ToggleGroup>
            </div>
          </Row>
        )}
        <Row label="Color" access={access("color")}>
          <ColorField
            label="Color"
            value={typeof own.color === "string" ? own.color : undefined}
            shown={shown(now.color)}
            disabled={off("color")}
            onCommit={(v) => write("color", v)}
          />
        </Row>
        <Row label="Background" access={access("background")}>
          <ColorField
            label="Background"
            value={typeof own.background === "string" ? own.background : undefined}
            shown={shown(now.background)}
            disabled={off("background")}
            onCommit={(v) => write("background", v)}
          />
        </Row>
        {(["highlight", "highlightBox", "upcoming"] as const).filter(has).map((key) => (
          <Row
            key={key}
            label={key === "highlightBox" ? "Highlight box" : key[0]?.toUpperCase() + key.slice(1)}
            access={access(key)}
          >
            <ColorField
              label={key}
              value={typeof own[key] === "string" ? (own[key] as string) : undefined}
              shown={shown(now[key])}
              disabled={off(key)}
              onCommit={(v) => write(key, v)}
            />
          </Row>
        ))}
        <Row label="Stroke" access={access("stroke")}>
          <div className="grid grid-cols-[1fr_4.5rem] gap-2">
            <ColorField
              label="Stroke color"
              value={typeof ownStroke.color === "string" ? ownStroke.color : undefined}
              shown={shown(stroke.color)}
              disabled={off("stroke")}
              onCommit={(v) => write("stroke", v ? { thickness: 2, ...ownStroke, color: v } : undefined)}
            />
            <NumberField
              name="Stroke thickness"
              value={typeof stroke.thickness === "number" ? stroke.thickness : undefined}
              min={0}
              max={100}
              disabled={off("stroke")}
              onCommit={(v) => write("stroke", { color: "#000000", ...ownStroke, thickness: v })}
            />
          </div>
        </Row>
        <Row label="Shadow" access={access("shadow")}>
          <div className="flex flex-col gap-2">
            <ColorField
              label="Shadow color"
              value={typeof ownShadow.color === "string" ? ownShadow.color : undefined}
              shown={shown(shadow.color)}
              disabled={off("shadow")}
              onCommit={(v) => write("shadow", v ? { blur: 8, y: 2, ...ownShadow, color: v } : undefined)}
            />
            <div className="grid grid-cols-3 gap-2">
              {(["blur", "x", "y"] as const).map((k) => (
                <NumberField
                  key={k}
                  name={`Shadow ${k}`}
                  value={typeof shadow[k] === "number" ? (shadow[k] as number) : undefined}
                  disabled={off("shadow")}
                  onCommit={(v) => write("shadow", { color: "#000000", ...ownShadow, [k]: v })}
                />
              ))}
            </div>
          </div>
        </Row>
      </div>
    </Group>
  );
}

/** Two fields side by side, each with its label above, as a design tool sets size beside weight. */
function Pair({ children }: { children: ReactNode }) {
  return <div className="grid grid-cols-2 gap-2">{children}</div>;
}

function Cell({ label, access, children }: { label: string; access: Access; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-1" data-editor-field={label}>
      <span className="flex items-center gap-1 text-xs text-muted-foreground">
        {label}
        {access !== "literal" && <LockMark access={access} />}
      </span>
      {children}
    </div>
  );
}
