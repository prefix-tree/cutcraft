import type { SvgNode } from "./svg";

/**
 * SVG animation (SMIL) evaluated at one moment of the element's own time and
 * written into plain attributes, so the frame is the same in the browser
 * (which would otherwise play SMIL on its own clock) and in skia (which does
 * not play it at all).
 *
 * Covered: `<animate>`, `<set>`, `<animateTransform>` and `<animateColor>`;
 * `values`, `from`/`to`/`by`, `keyTimes`, `keySplines`; linear, discrete,
 * spline and paced (as linear) timing; `begin` and `end` as offsets or
 * `id.begin`/`id.end` with an offset; `dur`, `repeatCount`, `repeatDur`,
 * `fill="freeze"`, `additive` and `accumulate="sum"`; a target by `href`.
 * Not covered, and dropped with a warning: `<animateMotion>`, and begins on
 * events (`click`, `mouseover`) or `indefinite`.
 */

const ANIMATIONS = new Set(["animate", "set", "animateTransform", "animateColor", "animateMotion"]);

/** Whether a tree has SMIL animations in it. */
export function hasSmil(node: SvgNode): boolean {
  return ANIMATIONS.has(node.name) || node.children.some((c) => typeof c !== "string" && hasSmil(c));
}

interface Anim {
  readonly node: SvgNode;
  readonly target: SvgNode;
  readonly order: number;
}

interface Interval {
  readonly begin: number;
  readonly end: number;
}

/** The tree with every animation applied at `time` seconds and removed. Returns a copy; the input is not changed. */
export function freezeSmil(root: SvgNode, time: number, warnings: string[]): SvgNode {
  const copy = clone(root);
  const ids = new Map<string, SvgNode>();
  const anims: Anim[] = [];
  const collect = (node: SvgNode, parent: SvgNode | null): void => {
    if (node.attrs.id) ids.set(node.attrs.id, node);
    if (ANIMATIONS.has(node.name) && parent) anims.push({ node, target: parent, order: anims.length });
    for (const c of node.children) if (typeof c !== "string") collect(c, node);
  };
  collect(copy, null);
  if (anims.length === 0) return copy;

  const byId = new Map<string, Anim>();
  for (const a of anims) {
    const href = a.node.attrs.href ?? a.node.attrs["xlink:href"];
    if (href?.startsWith("#")) {
      const t = ids.get(href.slice(1));
      if (t) (a as { target: SvgNode }).target = t;
    }
    if (a.node.attrs.id) byId.set(a.node.attrs.id, a);
  }

  const warned = new Set<string>();
  const warn = (key: string, message: string): void => {
    if (!warned.has(key)) {
      warned.add(key);
      warnings.push(message);
    }
  };
  const intervals = new Map<Anim, Interval | null>();
  const resolving = new Set<Anim>();
  const intervalOf = (a: Anim): Interval | null => {
    if (intervals.has(a)) return intervals.get(a) as Interval | null;
    if (resolving.has(a)) {
      warn("cycle", "SMIL animations that begin on each other in a loop are left out");
      return null;
    }
    resolving.add(a);
    const result = activeInterval(
      a,
      time,
      (id, edge) => {
        const other = byId.get(id);
        const iv = other ? intervalOf(other) : null;
        return iv ? (edge === "begin" ? iv.begin : iv.end) : null;
      },
      warn,
    );
    resolving.delete(a);
    intervals.set(a, result);
    return result;
  };

  // Base values, before any animation touches them; animations then apply in document order.
  const base = new Map<SvgNode, Record<string, string>>();
  const sandwich = new Map<SvgNode, Map<string, string>>();
  for (const a of anims) {
    if (a.node.name === "animateMotion") {
      warn("motion", "<animateMotion> is not played; the element stays where it is");
      continue;
    }
    const name = a.node.name === "animateTransform" ? "transform" : a.node.attrs.attributeName;
    if (!name) continue;
    const iv = intervalOf(a);
    if (!iv) continue;
    const baseAttrs = base.get(a.target) ?? { ...a.target.attrs, ...styleProps(a.target.attrs.style) };
    base.set(a.target, baseAttrs);
    const current = sandwich.get(a.target) ?? new Map<string, string>();
    sandwich.set(a.target, current);
    const under = current.get(name) ?? baseAttrs[name] ?? "";
    const value = valueAt(a, iv, time, under, baseAttrs[name] ?? "");
    if (value !== null) current.set(name, value);
  }
  for (const [target, values] of sandwich) {
    for (const [name, value] of values) {
      target.attrs[name] = value;
      // An inline style would win over the attribute; the animated value must win.
      if (target.attrs.style) target.attrs.style = withoutProp(target.attrs.style, name);
    }
  }
  return strip(copy);
}

/** The first interval of an animation that has begun by `time` (the latest such), or null when it never applies. */
function activeInterval(
  a: Anim,
  time: number,
  sync: (id: string, edge: "begin" | "end") => number | null,
  warn: (k: string, m: string) => void,
): Interval | null {
  const attrs = a.node.attrs;
  const begins = timeList(attrs.begin ?? "0", sync, (spec) =>
    warn(`begin:${spec}`, `SMIL begin "${spec}" waits for an event or a script; that animation is left out`),
  );
  const started = begins.filter((b) => b <= time + 1e-9);
  if (begins.length === 0) return null;
  const begin = started.length ? Math.max(...started) : Math.min(...begins);
  const simple = durationOf(a);
  const repeatCount =
    attrs.repeatCount === "indefinite" ? Infinity : attrs.repeatCount !== undefined ? Number(attrs.repeatCount) : null;
  const repeatDur =
    attrs.repeatDur === "indefinite" ? Infinity : attrs.repeatDur !== undefined ? clock(attrs.repeatDur) : null;
  let active = simple;
  if (repeatCount !== null || repeatDur !== null)
    active = Math.min(repeatCount === null ? Infinity : simple * repeatCount, repeatDur ?? Infinity);
  if (attrs.end !== undefined) {
    const ends = timeList(attrs.end, sync, () => undefined).filter((e) => e >= begin);
    if (ends.length) active = Math.min(active, Math.min(...ends) - begin);
  }
  return { begin, end: begin + Math.max(0, active) };
}

function durationOf(a: Anim): number {
  const dur = a.node.attrs.dur;
  if (dur === undefined || dur === "indefinite" || dur === "media") return Infinity;
  const d = clock(dur);
  return d !== null && d > 0 ? d : Infinity;
}

/** The animation's value at `time`, over `under` (what lower animations or the base give), or null when it does not apply. */
function valueAt(a: Anim, iv: Interval, time: number, under: string, baseValue: string): string | null {
  const attrs = a.node.attrs;
  if (time < iv.begin) return null;
  const frozen = time >= iv.end;
  if (frozen && attrs.fill !== "freeze") return null;
  if (a.node.name === "set") return attrs.to ?? null;

  const dur = durationOf(a);
  const t = (frozen ? iv.end : time) - iv.begin;
  let iteration = 0,
    k: number;
  if (!Number.isFinite(dur)) k = 0;
  else {
    iteration = Math.floor(t / dur);
    k = (t - iteration * dur) / dur;
    // Frozen at the end of a whole number of repeats: the last value, not the first of the next repeat.
    if (frozen && iteration > 0 && k < 1e-9) {
      iteration -= 1;
      k = 1;
    }
  }

  const list = valuesOf(a, baseValue);
  if (list.length === 0) return null;
  let value = sample(list, k, attrs);
  if (attrs.accumulate === "sum" && iteration > 0)
    value = addValues(value, scaleValue(list[list.length - 1] as string, iteration));
  const transform = a.node.name === "animateTransform";
  if (transform) value = `${attrs.type ?? "translate"}(${value})`;
  const additive = attrs.additive === "sum" || (!attrs.values && !attrs.from && attrs.by !== undefined);
  if (additive) return transform ? `${under} ${value}`.trim() : addValues(under, value);
  return value;
}

function valuesOf(a: Anim, baseValue: string): string[] {
  const attrs = a.node.attrs;
  if (attrs.values)
    return attrs.values
      .split(";")
      .map((v) => v.trim())
      .filter((v) => v.length > 0);
  if (attrs.from !== undefined && attrs.to !== undefined) return [attrs.from, attrs.to];
  if (attrs.from !== undefined && attrs.by !== undefined) return [attrs.from, addValues(attrs.from, attrs.by)];
  if (attrs.to !== undefined) return [a.node.name === "animateTransform" ? "0" : baseValue || attrs.to, attrs.to];
  if (attrs.by !== undefined) return [scaleValue(attrs.by, 0), attrs.by];
  return [];
}

/** The value `k` (0..1) of the way through a list, by the animation's calcMode, keyTimes and keySplines. */
function sample(values: readonly string[], k: number, attrs: Readonly<Record<string, string>>): string {
  const mode = attrs.calcMode ?? "linear";
  const n = values.length;
  if (n === 1) return values[0] as string;
  const times = attrs.keyTimes?.split(";").map(Number);
  const keys = times && times.length === n && times.every(Number.isFinite) ? times : null;
  if (mode === "discrete") {
    if (keys) {
      let i = 0;
      while (i + 1 < n && (keys[i + 1] as number) <= k + 1e-9) i++;
      return values[i] as string;
    }
    return values[Math.min(n - 1, Math.floor(k * n))] as string;
  }
  let i: number, local: number;
  if (keys) {
    i = 0;
    while (i + 2 < n && (keys[i + 1] as number) <= k) i++;
    const a = keys[i] as number,
      b = keys[i + 1] as number;
    local = b > a ? (k - a) / (b - a) : 1;
  } else {
    const x = k * (n - 1);
    i = Math.min(n - 2, Math.floor(x));
    local = x - i;
  }
  local = Math.max(0, Math.min(1, local));
  if (mode === "spline") {
    const spline = attrs.keySplines
      ?.split(";")
      [i]?.trim()
      .split(/[\s,]+/)
      .map(Number);
    if (spline && spline.length === 4 && spline.every(Number.isFinite))
      local = bezier(local, spline as [number, number, number, number]);
  }
  return interpolate(values[i] as string, values[i + 1] as string, local);
}

/** Two values `k` of the way from `a` to `b`: numbers in the same places interpolate, colours mix, anything else switches halfway. */
export function interpolate(a: string, b: string, k: number): string {
  const ca = colour(a),
    cb = colour(b);
  if (ca && cb) {
    const ch = (i: number) => Math.round((ca[i] as number) + ((cb[i] as number) - (ca[i] as number)) * k);
    return `rgb(${ch(0)}, ${ch(1)}, ${ch(2)})`;
  }
  const pa = split(a),
    pb = split(b);
  if (pa.text.length === pb.text.length && pa.text.every((t, i) => t === pb.text[i])) {
    let out = pa.text[0] as string;
    for (let i = 0; i < pa.nums.length; i++)
      out +=
        fmt((pa.nums[i] as number) + ((pb.nums[i] as number) - (pa.nums[i] as number)) * k) +
        (pa.text[i + 1] as string);
    return out;
  }
  return k < 0.5 ? a : b;
}

// Each number has one way to match (digits first, or a leading dot), so a long run of digits never backtracks.
const NUMBER = /[-+]?(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][-+]?\d+)?/g;

/** A value as the text between its numbers, and the numbers. */
function split(v: string): { text: string[]; nums: number[] } {
  const text: string[] = [],
    nums: number[] = [];
  let last = 0;
  for (const m of v.matchAll(NUMBER)) {
    text.push(v.slice(last, m.index));
    nums.push(Number(m[0]));
    last = (m.index ?? 0) + m[0].length;
  }
  text.push(v.slice(last));
  return { text, nums };
}

function addValues(a: string, b: string): string {
  if (!a) return b;
  const ca = colour(a),
    cb = colour(b);
  if (ca && cb) return `rgb(${ca.map((x, i) => Math.min(255, Math.round(x + (cb[i] as number)))).join(", ")})`;
  const pa = split(a),
    pb = split(b);
  if (pa.nums.length !== pb.nums.length) return b;
  let out = pb.text[0] as string;
  for (let i = 0; i < pb.nums.length; i++)
    out += fmt((pa.nums[i] as number) + (pb.nums[i] as number)) + (pb.text[i + 1] as string);
  return out;
}

function scaleValue(v: string, k: number): string {
  const p = split(v);
  let out = p.text[0] as string;
  for (let i = 0; i < p.nums.length; i++) out += fmt((p.nums[i] as number) * k) + (p.text[i + 1] as string);
  return out;
}

const NAMED: Readonly<Record<string, [number, number, number]>> = {
  black: [0, 0, 0],
  white: [255, 255, 255],
  red: [255, 0, 0],
  green: [0, 128, 0],
  blue: [0, 0, 255],
  yellow: [255, 255, 0],
  orange: [255, 165, 0],
  purple: [128, 0, 128],
  gray: [128, 128, 128],
  grey: [128, 128, 128],
  cyan: [0, 255, 255],
  magenta: [255, 0, 255],
};

function colour(v: string): [number, number, number] | null {
  const c = v.trim().toLowerCase();
  const hex = /^#([0-9a-f]{3}|[0-9a-f]{6})$/.exec(c);
  if (hex) {
    const h =
      (hex[1] as string).length === 3
        ? (hex[1] as string)
            .split("")
            .map((x) => x + x)
            .join("")
        : (hex[1] as string);
    return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
  }
  const fn = /^rgb\(\s*([\d.]+)[\s,]+([\d.]+)[\s,]+([\d.]+)\s*\)$/.exec(c);
  if (fn) return [Number(fn[1]), Number(fn[2]), Number(fn[3])];
  return NAMED[c] ?? null;
}

/** A cubic-bezier easing (x1 y1 x2 y2) at progress x. */
function bezier(x: number, [x1, y1, x2, y2]: [number, number, number, number]): number {
  const at = (t: number, a: number, b: number) => 3 * (1 - t) * (1 - t) * t * a + 3 * (1 - t) * t * t * b + t * t * t;
  let lo = 0,
    hi = 1,
    t = x;
  for (let i = 0; i < 30; i++) {
    t = (lo + hi) / 2;
    if (at(t, x1, x2) < x) lo = t;
    else hi = t;
  }
  return at(t, y1, y2);
}

/** A begin or end list: offsets and `id.begin`/`id.end` with an offset. Event and `indefinite` entries are left out (and reported). */
function timeList(
  spec: string,
  sync: (id: string, edge: "begin" | "end") => number | null,
  unsupported: (spec: string) => void,
): number[] {
  const out: number[] = [];
  for (const raw of spec.split(";")) {
    const s = raw.trim();
    if (!s) continue;
    const offset = clock(s);
    if (offset !== null) {
      out.push(offset);
      continue;
    }
    const m = /^([A-Za-z_][\w-]*)\.(begin|end)\s*(?:([+-])\s*(.+))?$/.exec(s);
    if (m) {
      const at = sync(m[1] as string, m[2] as "begin" | "end");
      const extra = m[4] ? clock(m[4]) : 0;
      if (at !== null && extra !== null && Number.isFinite(at)) out.push(at + (m[3] === "-" ? -extra : extra));
      continue;
    }
    unsupported(s);
  }
  return out;
}

/** A SMIL clock value in seconds: `2s`, `500ms`, `1.5`, `1min`, `0.1h`, `01:02.5`, `00:01:02`. */
export function clock(v: string): number | null {
  const s = v.trim();
  const unit = /^([-+]?[\d.]+)\s*(h|min|s|ms)?$/.exec(s);
  if (unit) {
    const n = Number(unit[1]);
    if (!Number.isFinite(n)) return null;
    return n * ({ h: 3600, min: 60, s: 1, ms: 0.001 }[unit[2] ?? "s"] as number);
  }
  const parts = /^(?:(\d+):)?(\d+):(\d+(?:\.\d+)?)$/.exec(s);
  if (parts) return Number(parts[1] ?? 0) * 3600 + Number(parts[2]) * 60 + Number(parts[3]);
  return null;
}

function styleProps(style: string | undefined): Record<string, string> {
  const out: Record<string, string> = {};
  for (const decl of (style ?? "").split(";")) {
    const i = decl.indexOf(":");
    if (i > 0) out[decl.slice(0, i).trim()] = decl.slice(i + 1).trim();
  }
  return out;
}

function withoutProp(style: string, name: string): string {
  return style
    .split(";")
    .filter((d) => d.split(":")[0]?.trim() !== name)
    .join(";");
}

function clone(node: SvgNode): SvgNode {
  return {
    name: node.name,
    attrs: { ...node.attrs },
    children: node.children.map((c) => (typeof c === "string" ? c : clone(c))),
  };
}

function strip(node: SvgNode): SvgNode {
  return {
    ...node,
    children: node.children
      .filter((c) => typeof c === "string" || !ANIMATIONS.has(c.name))
      .map((c) => (typeof c === "string" ? c : strip(c))),
  };
}

function fmt(v: number): string {
  return String(Math.round(v * 1000) / 1000);
}
