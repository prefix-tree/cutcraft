// @vitest-environment jsdom
import { collectModule, resolve } from "@cutcraft/kit";
import { loadModule } from "@cutcraft/kit/source";

import { FREE_CODE_LIBRARIES } from "../src/libraries";

const file = `
import { Composition, Layer, Track } from "@cutcraft/kit";
import { ThreeScene } from "@cutcraft/graphics/three";
import { useTimeline } from "@cutcraft/graphics/motion";
import { useFrame } from "@react-three/fiber";
import { motion } from "motion/react";
import { Color } from "three";

export const manifest = { assets: {} };
export const accent = new Color("#ff5a1f").getHexString();
export const kinds = [typeof ThreeScene, typeof useTimeline, typeof useFrame, typeof motion.div];

export default function Video() {
  return (
    <Composition fps={30} width={640} height={360}>
      <Track id="free" layout="free">
        <Layer id="scene" start={0} duration={2}><ThreeScene /></Layer>
      </Track>
    </Composition>
  );
}`;

describe("FREE_CODE_LIBRARIES", () => {
  it("lets a file import three.js, React Three Fiber, Motion and the clock adapters", () => {
    const mod = loadModule(file, { imports: FREE_CODE_LIBRARIES }) as unknown as Record<string, unknown>;
    expect(mod.accent).toBe("ff5a1f");
    expect(mod.kinds).toEqual(["function", "function", "function", "object"]);
    const state = resolve(collectModule(mod as never), { assets: {} });
    expect(state.errors).toEqual([]);
  });

  it("is refused by a host that does not offer it", () => {
    expect(() => loadModule(file)).toThrow(/does not offer/);
  });
});
