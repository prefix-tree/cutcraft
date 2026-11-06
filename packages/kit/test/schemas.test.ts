import { describe, expect, it } from "vitest";

import {
  capabilitiesOf,
  defaultTransitionParams,
  ELEMENTS,
  isKeyframeProperty,
  isVocabulary,
  SCHEMAS_BY_KIND,
  TRANSITION_PARAMS,
  TRANSITION_TYPES,
} from "@cutcraft/kit";

import { fixtureTree } from "./helpers";

describe("element schemas", () => {
  it("every component carries its kind, schema and capabilities", () => {
    for (const [name, component] of Object.entries(ELEMENTS)) {
      expect(isVocabulary(component)).toBe(true);
      expect(component.displayName).toBe(component.kind);
      expect(SCHEMAS_BY_KIND[component.kind]).toBe(component.schema);
      expect(capabilitiesOf(component.kind).placementScope).toBeDefined();
      expect(name.toLowerCase().startsWith(component.kind.slice(0, 3).toLowerCase())).toBe(true);
    }
    expect(isVocabulary(() => null)).toBe(false);
  });

  it("accepts every element in the sample file", () => {
    for (const node of fixtureTree().byId.values()) {
      const schema = SCHEMAS_BY_KIND[node.kind];
      if (!schema) continue;
      const result = schema.safeParse(node.props);
      expect(result.success, `${node.kind} ${node.id}: ${result.success ? "" : result.error.message}`).toBe(true);
    }
  });

  it("rejects unknown props, bad ranges and bad references", () => {
    const clip = ELEMENTS.Clip.schema;
    expect(clip.safeParse({ id: "c", src: "asset:a", bogus: 1 }).success).toBe(false);
    expect(clip.safeParse({ id: "c", src: "asset:a", speed: 50 }).success).toBe(false);
    expect(clip.safeParse({ id: "c", src: "nope" }).success).toBe(false);
    expect(clip.safeParse({ id: "c", src: "asset:a", in: "word:x" }).success).toBe(false);
    expect(clip.safeParse({ id: "bad id", src: "asset:a" }).success).toBe(false);
    expect(clip.safeParse({ id: "c", src: "asset:a", in: "silence:2.end", duration: { match: "d" } }).success).toBe(
      true,
    );
  });

  it("applies defaults", () => {
    const parsed = ELEMENTS.Title.schema.parse({ id: "t" });
    expect(parsed).toMatchObject({ font: "Inter", size: 48, weight: "bold", align: "center" });
    expect(ELEMENTS.Track.schema.parse({ id: "t" })).toMatchObject({
      layout: "sequence",
      role: "general",
      locked: false,
    });
    expect(ELEMENTS.Composition.schema.parse({ fps: 30, width: 1920, height: 1080 })).toMatchObject({
      id: "composition",
      sampleRate: 48000,
      channels: 2,
    });
  });

  it("validates transition params per type", () => {
    for (const type of TRANSITION_TYPES) {
      expect(TRANSITION_PARAMS[type].safeParse({}).success, type).toBe(true);
      expect(
        ELEMENTS.Transition.schema.safeParse({ id: "x", type, params: defaultTransitionParams(type) }).success,
        type,
      ).toBe(true);
    }
    expect(
      ELEMENTS.Transition.schema.safeParse({ id: "x", type: "wipe", params: { direction: "sideways" } }).success,
    ).toBe(false);
    expect(ELEMENTS.Transition.schema.safeParse({ id: "x", on: "c1" }).success).toBe(false);
    expect(defaultTransitionParams("crossfade")).toEqual({ curve: "ease" });
  });

  it("knows keyframe properties of the parent element; an effect's params are keyframed inside the effect", () => {
    expect(isKeyframeProperty("transform.opacity")).toBe(true);
    expect(isKeyframeProperty("effect.fx1.radius")).toBe(false);
    expect(isKeyframeProperty("opacity")).toBe(false);
  });

  it("Svg takes src or content, not both", () => {
    expect(ELEMENTS.Svg.schema.safeParse({ id: "v", src: "asset:logo", content: "<svg/>" }).success).toBe(false);
    expect(ELEMENTS.Svg.schema.safeParse({ id: "v" }).success).toBe(false);
  });
});
