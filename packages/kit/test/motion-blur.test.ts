import { describe, expect, it } from "vitest";

import { collectModule, motionBlurOf, resolve, shutterTimes } from "@cutcraft/kit";
import { loadModule } from "@cutcraft/kit/source";

const stateOf = (props: string) =>
  resolve(
    collectModule(
      loadModule(`import { Composition, Track } from "@cutcraft/kit";
export default function Video() {
  return <Composition fps={30} width={640} height={360} ${props}><Track id="t" /></Composition>;
}`) as never,
    ),
    { assets: {} },
  );

describe("motion blur", () => {
  it("is off unless the composition asks, with film defaults when it does", () => {
    expect(motionBlurOf(stateOf(""))).toBeNull();
    expect(motionBlurOf(stateOf("motionBlur={{}}"))).toEqual({ shutterAngle: 180, samples: 8 });
    expect(motionBlurOf(stateOf("motionBlur={{ shutterAngle: 90, samples: 4 }}"))).toEqual({
      shutterAngle: 90,
      samples: 4,
    });
    expect(stateOf("motionBlur={{ samples: 1 }}").errors.length).toBeGreaterThan(0);
  });

  it("samples the open shutter from the frame's time, never past the end", () => {
    // 180° at 30 fps: open for 1/60 s, four samples a quarter of that apart.
    expect(shutterTimes(1, 30, { shutterAngle: 180, samples: 4 }, 10).map((t) => Math.round(t * 1e4) / 1e4)).toEqual([
      1, 1.0042, 1.0083, 1.0125,
    ]);
    expect(Math.max(...shutterTimes(9.99, 30, { shutterAngle: 360, samples: 8 }, 10))).toBeLessThan(10);
  });
});
