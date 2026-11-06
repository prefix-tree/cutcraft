import { type ReactNode, useLayoutEffect, useRef } from "react";

import { holdLayerFrame } from "@cutcraft/kit";

import { defaultCreateCanvas } from "../media/frame-source";
import type { ShaderPass } from "../model/shaders";
import { ShaderRunner } from "../render/shaders";
import type { AnyCanvas } from "../types";
import { devWarn } from "../warn";
import { htmlInCanvas } from "./html-in-canvas";

type DrawingContext = CanvasRenderingContext2D & { drawElementImage(element: Element, x: number, y: number): void };

/** One WebGL runner per frame size for the whole page: a browser allows only a few WebGL contexts at once. */
const runners = new Map<string, ShaderRunner>();
function runnerFor(width: number, height: number): ShaderRunner {
  const key = `${width}x${height}`;
  let runner = runners.get(key);
  if (!runner) {
    runner = new ShaderRunner(width, height, defaultCreateCanvas);
    runners.set(key, runner);
  }
  return runner;
}

/**
 * An overlay drawn through the effects the file declares (`effect()`): its DOM lives inside a canvas
 * (HTML-in-Canvas), which draws it, runs the shaders over the picture and shows the result. The box is the frame's
 * size, so the overlay keeps its place in it. A browser without HTML-in-Canvas shows the overlay without the effects.
 */
export function ShaderBox(p: {
  readonly id: string;
  readonly width: number;
  readonly height: number;
  readonly passes: readonly ShaderPass[];
  readonly children: ReactNode;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const innerRef = useRef<HTMLDivElement>(null);
  const supported = htmlInCanvas();
  // Every render: the time, the params or the content may have changed. The export waits for the frame (holdLayerFrame).
  useLayoutEffect(() => {
    const canvas = canvasRef.current;
    const inner = innerRef.current;
    if (!supported || !canvas || !inner) return;
    const release = holdLayerFrame();
    let done = false;
    const draw = () => {
      if (done) return;
      done = true;
      try {
        const ctx = canvas.getContext("2d") as DrawingContext | null;
        if (!ctx) return;
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.clearRect(0, 0, p.width, p.height);
        ctx.drawElementImage(inner, 0, 0);
        const result = runnerFor(p.width, p.height).effects(canvas as AnyCanvas, p.passes);
        if (result) {
          ctx.clearRect(0, 0, p.width, p.height);
          ctx.drawImage(result as CanvasImageSource, 0, 0);
        }
      } catch (error) {
        devWarn(`shader-error:${p.id}`, `"${p.id}": ${error instanceof Error ? error.message : String(error)}`);
      } finally {
        release();
      }
    };
    // The canvas's children are laid out and painted by the time `paint` fires; without it, two animation frames.
    const request = (canvas as unknown as { requestPaint?: () => void }).requestPaint;
    canvas.addEventListener("paint", draw, { once: true });
    if (typeof request === "function") request.call(canvas);
    const frame = requestAnimationFrame(() => requestAnimationFrame(draw));
    return () => {
      canvas.removeEventListener("paint", draw);
      cancelAnimationFrame(frame);
      done = true;
      release();
    };
  });
  if (!supported) {
    devWarn(
      `html-in-canvas:${p.id}`,
      `"${p.id}" has an effect the file declares; this browser has no HTML-in-Canvas (Chrome's CanvasDrawElement feature), so it shows without it (the export draws it)`,
    );
    return <>{p.children}</>;
  }
  const box = { position: "absolute", left: 0, top: 0, width: p.width, height: p.height } as const;
  return (
    <canvas
      ref={canvasRef}
      data-shader-box={p.id}
      width={p.width}
      height={p.height}
      style={{ ...box, pointerEvents: "none" }}
      {...{ layoutsubtree: "", content: "drawable" }}
    >
      <div ref={innerRef} style={box} {...{ drawable: "" }}>
        {p.children}
      </div>
    </canvas>
  );
}
