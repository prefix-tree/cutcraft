import { createElement } from "react";
import { describe, expect, it } from "vitest";
import {
  Captions, Clip, Composition, Executor, Shape, Title, Track, Transition, applyTheme, collect, resolve, resolveTheme, THEMES, type ThemeInput,
} from "@cutcraft/kit";
import { foldToSource, lint } from "@cutcraft/kit/source";
import { fixtureExecutor, fixtureText, manifest } from "./helpers";

const h = createElement;

function film(theme: ThemeInput | undefined, ...overlays: ReturnType<typeof h>[]) {
  return h(Composition, { fps: 30, width: 1920, height: 1080, ...(theme === undefined ? {} : { theme }) },
    h(Track, { id: "main" },
      h(Clip, { id: "c1", src: "asset:city", in: 0, out: 4 }),
      h(Transition, { id: "x" }),
      h(Clip, { id: "c2", src: "asset:city", in: 4, out: 8 }),
    ),
    h(Track, { id: "over", layout: "free" }, ...overlays),
  );
}

describe("theme", () => {
  it("resolves tokens against the default theme when the file declares none, and leaves the rest alone", () => {
    const state = resolve(collect(film(undefined,
      h(Shape, { id: "s", start: 0, shape: "rectangle", fill: "$primary", cornerRadius: "$radius" }),
      h(Title, { id: "t", start: 0 }, "Hello"),
    )), manifest);
    expect(state.errors).toEqual([]);
    const midnight = THEMES.midnight;
    expect(state.items.get("s")?.props).toMatchObject({ fill: midnight.palette.primary, cornerRadius: midnight.radius });
    expect(state.items.get("s")?.themed).toEqual({ fill: "$primary", cornerRadius: "$radius" });
    // No declared theme: no default preset, no motion.
    expect(state.items.get("t")?.props).toMatchObject({ font: "Inter", color: "#ffffff" });
    expect(state.items.get("t")?.props.enter).toBeUndefined();
    expect(state.items.get("t")?.themed).toBeUndefined();
    expect(state.theme.declared).toBe(false);
  });

  it("applies presets under the element's own props and records where values came from", () => {
    const state = resolve(collect(film({ extends: "paper" },
      h(Title, { id: "plain", start: 0 }, "Plain"),
      h(Title, { id: "big", start: 0, style: "h1", color: "#123456" }, "Big"),
    )), manifest);
    expect(state.errors).toEqual([]);
    const paper = THEMES.paper;
    expect(state.items.get("plain")?.props).toMatchObject({ font: paper.fonts.heading, color: paper.palette.text, size: 48 });
    expect(state.items.get("big")?.props).toMatchObject({ font: paper.fonts.heading, size: 96, weight: 700, color: "#123456" });
    expect(state.items.get("big")?.themed).toMatchObject({ font: "$heading", size: "style:h1" });
    expect(state.items.get("big")?.themed?.color).toBeUndefined();
  });

  it("fills entrances, exits and transitions from the motion style where the file says nothing", () => {
    const state = resolve(collect(film({ motion: "bouncy" },
      h(Title, { id: "t", start: 0 }, "Pop"),
      h(Title, { id: "own", start: 0, enter: { type: "fade" } }, "Own"),
      h(Title, { id: "text", start: 0, animation: { preset: "typewriter" } }, "Typed"),
      h(Shape, { id: "s", start: 0, shape: "circle" }),
    )), manifest);
    expect(state.errors).toEqual([]);
    expect(state.items.get("t")?.props.enter).toMatchObject({ type: "pop", duration: 0.5 });
    expect(state.items.get("t")?.props.exit).toMatchObject({ type: "scale" });
    expect(state.items.get("own")?.props.enter).toMatchObject({ type: "fade", duration: 0.5, easing: "ease-out" });
    expect(state.items.get("own")?.props.exit).toMatchObject({ type: "scale" });
    expect(state.items.get("text")?.props.enter).toBeUndefined();
    expect(state.items.get("s")?.props.enter).toMatchObject({ type: "pop" });
    expect(state.items.get("x")?.props).toMatchObject({ type: "crossfade", duration: 0.4 });
    expect(state.items.get("x")?.themed).toEqual({ type: "motion", duration: "motion" });
  });

  it("merges palette, fonts and presets over the base theme", () => {
    const theme = resolveTheme({ extends: "neon", palette: { primary: "#ff5a1f", brand: "#00ff00" }, fonts: { heading: "Playfair Display" }, radius: 3, styles: { title: { h1: { size: 120 }, hero: { size: 140, color: "$brand" } } } });
    expect(theme.palette).toMatchObject({ primary: "#ff5a1f", brand: "#00ff00", secondary: THEMES.neon.palette.secondary });
    expect(theme.tokens).toMatchObject({ heading: "Playfair Display", body: THEMES.neon.fonts.body, radius: 3 });
    expect(theme.styles.title?.h1).toMatchObject({ size: 120, font: "$heading", weight: 700 });
    const hero = applyTheme("title", { id: "t", style: "hero" }, theme);
    expect(hero.props).toMatchObject({ size: 140, color: "#00ff00", style: "hero" });
    const raw = { extends: "neon" };
    expect(resolveTheme(raw)).toBe(resolveTheme(raw));
  });

  it("paints the background from the palette and names caption presets", () => {
    const el = h(Composition, { fps: 30, width: 1280, height: 720, theme: { extends: "pastel" } },
      h(Track, { id: "main" }, h(Clip, { id: "c1", src: "asset:city", in: 0, out: 2 })),
      h(Captions, { id: "caps", style: "boxed" }),
    );
    const state = resolve(collect(el), manifest);
    expect(state.errors).toEqual([]);
    expect(state.items.get("composition")?.props.background).toEqual({ mode: "color", color: THEMES.pastel.palette.background });
    expect(state.items.get("caps")?.props.style).toMatchObject({ background: THEMES.pastel.palette.surface, highlight: THEMES.pastel.palette.primary });
  });

  it("reports unknown tokens and styles", () => {
    const state = resolve(collect(film({},
      h(Shape, { id: "s", start: 0, shape: "rectangle", fill: "$brand" }),
      h(Title, { id: "t", start: 0, style: "giant" }, "?"),
    )), manifest);
    expect(state.errors.map((e) => [e.code, e.id, e.prop])).toEqual(expect.arrayContaining([["UNKNOWN_TOKEN", "s", "fill"], ["UNKNOWN_STYLE", "t", "style"]]));
  });

  it("keeps placements the theme does not touch when the theme changes", () => {
    const tree = collect(film({ extends: "midnight" }, h(Title, { id: "t", start: 0 }, "Hi")));
    const exec = new Executor({ tree, manifest, now: () => 0 });
    const before = exec.state();
    const result = exec.execute({ type: "composition/setTheme", params: { theme: { extends: "paper" } } });
    expect(result.ok).toBe(true);
    const after = exec.state();
    expect(after.items.get("c1")).toBe(before.items.get("c1"));
    expect(after.items.get("t")).not.toBe(before.items.get("t"));
    expect(after.items.get("t")?.props.font).toBe(THEMES.paper.fonts.heading);
    exec.execute({ type: "theme/setToken", params: { token: "$text", value: "#010203" } });
    expect(exec.state().items.get("t")?.props.color).toBe("#010203");
    expect(exec.state().items.get("composition")?.props.theme).toEqual({ extends: "paper", palette: { text: "#010203" } });
    exec.undo();
    exec.undo();
    expect(exec.state().items.get("t")?.props.font).toBe(THEMES.midnight.fonts.heading);
  });

  it("folds a theme change into the composition's theme literal", () => {
    const exec = fixtureExecutor();
    exec.execute({ type: "composition/setTheme", params: { theme: { extends: "neon", motion: "calm" } } });
    exec.execute({ type: "theme/setToken", params: { token: "primary", value: "#ff5a1f" } });
    const result = foldToSource(fixtureText, exec.log(), exec.state());
    expect(result.skipped).toEqual([]);
    expect(result.text).toContain('theme={{ extends: "neon", motion: "calm", palette: { primary: "#ff5a1f" } }}');
  });

  it("lints unknown tokens and styles, literal colours and fonts under a theme, and fonts no renderer ships", () => {
    const text = `import { Composition, Shape, Title, Track } from "@cutcraft/kit";
export default function Video() {
  return (
    <Composition fps={30} width={1920} height={1080} theme={{ extends: "paper", fonts: { mono: "Comic Mono" } }}>
      <Track id="over" layout="free">
        <Title id="a" start={0} style="h1" color="$brand">A</Title>
        <Title id="b" start={0} style="giant" font="Helvetica" color="#1d1b17">B</Title>
        <Shape id="s" start={0} shape="rectangle" fill="$surface" shadow={{ color: "#000000", blur: 10 }} />
      </Track>
    </Composition>
  );
}
`;
    const d = lint(text).filter((x) => x.rule.startsWith("theme") || x.rule === "font-available").map((x) => [x.rule, x.id, x.prop, x.severity]);
    expect(d).toEqual(expect.arrayContaining([
      ["theme-refs", "a", "color", "error"],
      ["theme-refs", "b", "style", "error"],
      ["theme-literals", "b", "font", "warning"],
      ["theme-literals", "b", "color", "warning"],
      ["font-available", "b", "font", "warning"],
      ["font-available", "composition", "theme", "warning"],
    ]));
    expect(d.filter((x) => x[1] === "s")).toEqual([]);
    expect(lint(text).find((x) => x.rule === "theme-literals" && x.prop === "color")?.message).toContain("$text");
  });
});
