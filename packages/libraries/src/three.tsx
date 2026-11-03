import { useLayer } from "@cutcraft/kit";
import { Canvas, useThree, type CanvasProps } from "@react-three/fiber";
import { useLayoutEffect, type CSSProperties } from "react";

export type ThreeSceneProps = Omit<CanvasProps, "frameloop">;

const FILL: CSSProperties = { position: "absolute", inset: 0 };

/**
 * A React Three Fiber canvas on the video's clock. It never draws on its own: every frame the player shows (or the
 * export captures) advances the scene to the layer's time, so `state.clock.elapsedTime` in `useFrame` is seconds
 * since the layer started, scrubbing backwards works, and two renders of a frame are the same picture.
 *
 * It fills its Layer unless `style` says otherwise, and keeps its drawing buffer so the export can capture it.
 */
export function ThreeScene({ children, gl, style, ...rest }: ThreeSceneProps) {
  // A renderer or a factory is the caller's own; options get a kept drawing buffer unless they say otherwise.
  const options = (typeof gl === "function" || isRenderer(gl) ? gl : { preserveDrawingBuffer: true, ...(gl as object | undefined) }) as NonNullable<CanvasProps["gl"]>;
  return (
    <Canvas {...rest} frameloop="never" gl={options} style={{ ...FILL, ...style }}>
      {children}
      {/* Last, so the children's useFrame subscriptions exist before the first advance. */}
      <VideoClock />
    </Canvas>
  );
}

function VideoClock() {
  const { elapsed } = useLayer();
  const advance = useThree((s) => s.advance);
  useLayoutEffect(() => { advance(elapsed, true); }, [advance, elapsed]);
  return null;
}

function isRenderer(gl: unknown): boolean {
  return typeof gl === "object" && gl !== null && "render" in gl && typeof (gl as { render: unknown }).render === "function";
}
