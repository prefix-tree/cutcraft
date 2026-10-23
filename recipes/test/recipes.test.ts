import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { collectModule, resolve, type AssetManifest, type ResolvedState } from "@cutcut/kit";
import { buildSourceIndex, lint } from "@cutcut/kit/source";
import * as talkingHead from "../talking-head";
import * as productDemo from "../product-demo";
import * as verticalPodcast from "../vertical-podcast";
import * as slideshow from "../slideshow";
import * as stats from "../stats";
import * as variants from "../variants";
import * as highlights from "../highlights";

const root = join(import.meta.dirname, "..");
const manifest = JSON.parse(readFileSync(join(root, "manifest.json"), "utf8")) as AssetManifest;

type Module = Parameters<typeof collectModule>[0];
const recipes: { name: string; file: string; mod: Module; check: (state: ResolvedState) => void }[] = [
  {
    name: "talking-head", file: "talking-head.tsx", mod: talkingHead as Module,
    check: (s) => {
      const at = (id: string) => s.items.get(id)!;
      expect(at("welcome")).toMatchObject({ start: 0, source: { in: 0.4, asset: "podcast" } });
      expect(at("answer").source).toMatchObject({ in: manifest.assets.podcast!.transcript!.words[35]!.start });
      expect(at("thanks").start).toBeCloseTo(at("welcome").end);
      expect(at("bed").end).toBeCloseTo(s.composition.duration);
      expect(cues(s).map((c) => c.props.text)).toEqual([
        "Welcome back to the show.", "Thanks for having me.", "So what is cutcut, in one sentence?",
        "It is a video file a model can write and a", "person can still edit.", "Why a file?",
        "Because the model is good at code and bad", "at documents.", "And the editor?",
        "The editor writes back into the same file,", "one token at a time.", "That is the whole idea.",
      ]);
      expect(cues(s)[0]).toMatchObject({ start: 0, editable: "generated" });
    },
  },
  {
    name: "product-demo", file: "product-demo.tsx", mod: productDemo as Module,
    check: (s) => {
      expect(s.items.get("rec")).toMatchObject({ start: 0, end: 20 });
      expect(s.items.get("ring-template")).toMatchObject({ start: 9, end: 10.5 });
      expect(s.items.get("click-deploy")).toMatchObject({ start: 15 });
      expect(s.items.get("z1-x1")).toMatchObject({ start: 3 });
      expect(cues(s).map((c) => c.props.text)).toEqual(["Open the dashboard.", "Click new project.", "Pick a template and name it.", "Then deploy."]);
      expect(cues(s)[0]!.start).toBeCloseTo(0.5);
    },
  },
  {
    name: "vertical-podcast", file: "vertical-podcast.tsx", mod: verticalPodcast as Module,
    check: (s) => {
      expect(s.composition).toMatchObject({ width: 1080, height: 1920 });
      expect(s.items.get("s0")?.props).toMatchObject({ transform: { crop: { x: 0.08 } } });
      expect(s.items.get("s1")?.props).toMatchObject({ transform: { crop: { x: 0.6 } } });
      expect(s.items.get("tag-s1")?.start).toBeCloseTo(s.items.get("s1")!.start + 0.2);
      expect(s.items.has("tag-s2")).toBe(true);
      expect(s.items.has("tag-s7")).toBe(true);
      expect(cues(s).every((c) => String(c.props.text).length <= 28)).toBe(true);
      expect(cues(s).length).toBeGreaterThan(12);
    },
  },
  {
    name: "slideshow", file: "slideshow.tsx", mod: slideshow as Module,
    check: (s) => {
      expect(s.items.get("p1")).toMatchObject({ start: 0, end: 4, editable: "generated" });
      expect(s.items.get("p2")?.start).toBeCloseTo(3.4);
      expect(s.items.get("p4")?.end).toBeCloseTo(14.2);
      expect(s.items.get("bed")?.end).toBeCloseTo(s.composition.duration);
      expect(s.items.get("p3-sx1")).toMatchObject({ start: s.items.get("p3")!.start + 4 });
    },
  },
  {
    name: "stats", file: "stats.tsx", mod: stats as Module,
    check: (s) => {
      expect(s.items.get("bg")).toMatchObject({ start: 0, end: 6 });
      expect(s.items.get("stat-deploys")?.interior).toEqual({ component: "Counter", props: { value: 12800, label: "deployments", accent: "#7cff8a" } });
      expect(s.items.get("stat-uptime")?.start).toBeCloseTo(6.4);
    },
  },
  {
    name: "variants", file: "variants.tsx", mod: variants as Module,
    check: (s) => {
      expect(s.tree.byId.get("headline")?.text).toBe("Small software, real cloud");
      expect(s.items.get("card")?.props).toMatchObject({ src: "asset:logo" });
      const es = resolve(collectModule(variants as Module, { headline: "Software pequeño, nube real", accent: "#ffcc00" }), manifest);
      expect(es.errors).toEqual([]);
      expect(es.tree.byId.get("headline")?.text).toBe("Software pequeño, nube real");
      expect(es.tree.byId.get("headline")?.props.color).toBe("#ffcc00");
      expect(es.items.get("card")?.end).toBe(s.items.get("card")?.end);
    },
  },
  {
    name: "highlights", file: "highlights.tsx", mod: highlights as Module,
    check: (s) => {
      expect(s.items.get("mc.cut-2")).toMatchObject({ start: 10, end: 25, editable: "generated", source: { asset: "asset:cam-b" } });
      expect(s.items.get("mc.cut-3")).toMatchObject({ start: 25 });
      expect(s.items.get("dense")).toMatchObject({ source: { in: 5.2, out: 7.64 } });
      expect(s.tracks.find((t) => t.id === "pull")?.hidden).toBe(true);
    },
  },
];

function cues(s: ResolvedState) {
  return [...s.items.values()].filter((p) => p.kind === "caption").sort((a, b) => a.start - b.start);
}

describe("recipes", () => {
  for (const r of recipes) {
    describe(r.name, () => {
      const text = readFileSync(join(root, r.file), "utf8");
      it("passes the lint with no errors and no warnings", () => {
        expect(lint(text, { manifest })).toEqual([]);
      });
      it("resolves without errors and places what the brief asks for", () => {
        const state = resolve(collectModule(r.mod, {}, { index: buildSourceIndex(text) }), manifest);
        expect(state.errors).toEqual([]);
        r.check(state);
      });
    });
  }
});
