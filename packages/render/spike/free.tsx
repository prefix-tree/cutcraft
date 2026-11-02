// Spike: free code inside a Layer — CSS 3D, a CSS @keyframes animation, a WebGL shader and hooks, over footage.
import { Clip, Composition, Layer, Track, useT, type AssetManifest } from "@cutcraft/kit";
import { useEffect, useRef } from "react";

export const manifest: AssetManifest = { assets: { footage: { id: "footage", kind: "video", duration: 60, fps: 30, width: 1920, height: 1080 } } };
export const defaults = {};

export default function Video() {
  return (
    <Composition fps={30} width={1920} height={1080}>
      <Track id="main">
        <Clip id="shot" src="asset:footage" in={10} out={14} fit="cover" />
      </Track>
      <Track id="free">
        <Layer id="scene" anchor="shot" duration={4}>
          <Scene />
        </Layer>
      </Track>
    </Composition>
  );
}

function Scene() {
  const t = useT();
  return (
    <div style={{ position: "absolute", inset: 0 }}>
      <style>{"@keyframes cc-spin { to { transform: rotate(360deg) } }"}</style>
      {/* CSS 3D: a card flipping with time. */}
      <div style={{ position: "absolute", left: 160, top: 240, perspective: 1000 }}>
        <div style={{ width: 640, height: 400, borderRadius: 24, background: "linear-gradient(135deg,#c8402a,#e0a458)", transform: `rotateY(${t * 90}deg) rotateX(12deg)`, display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", font: "800 72px sans-serif", boxShadow: "0 30px 60px rgba(0,0,0,.5)" }}>
          Free code
        </div>
      </div>
      {/* A CSS animation the virtual clock has to drive. */}
      <div style={{ position: "absolute", right: 260, top: 200, width: 220, height: 220, borderRadius: 32, background: "#7cb7a4", animation: "cc-spin 2s linear infinite", mixBlendMode: "screen" }} />
      <Shader t={t} />
      <div style={{ position: "absolute", left: 0, right: 0, bottom: 90, textAlign: "center", color: "#fff", font: "700 64px sans-serif", textShadow: "0 0 24px #c8402a", filter: `blur(${Math.max(0, 1 - t) * 8}px)` }}>
        Rendered by Chrome
      </div>
    </div>
  );
}

/** A raw WebGL fragment shader, redrawn from `t`. */
function Shader({ t }: { t: number }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const gl = useRef<{ g: WebGLRenderingContext; u: WebGLUniformLocation } | null>(null);
  useEffect(() => {
    const g = ref.current!.getContext("webgl", { preserveDrawingBuffer: true })!;
    const sh = (type: number, src: string) => { const s = g.createShader(type)!; g.shaderSource(s, src); g.compileShader(s); return s; };
    const p = g.createProgram()!;
    g.attachShader(p, sh(g.VERTEX_SHADER, "attribute vec2 a;void main(){gl_Position=vec4(a,0,1);}"));
    g.attachShader(p, sh(g.FRAGMENT_SHADER, "precision mediump float;uniform float t;void main(){vec2 p=gl_FragCoord.xy/400.0;float v=sin(p.x*10.0+t*3.0)+sin(p.y*10.0-t*2.0);gl_FragColor=vec4(0.5+0.5*sin(v),0.3,0.5+0.5*cos(v),1.0);}"));
    g.linkProgram(p); g.useProgram(p);
    const b = g.createBuffer(); g.bindBuffer(g.ARRAY_BUFFER, b); g.bufferData(g.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), g.STATIC_DRAW);
    const a = g.getAttribLocation(p, "a"); g.enableVertexAttribArray(a); g.vertexAttribPointer(a, 2, g.FLOAT, false, 0, 0);
    gl.current = { g, u: g.getUniformLocation(p, "t")! };
  }, []);
  useEffect(() => { const c = gl.current; if (!c) return; c.g.uniform1f(c.u, t); c.g.drawArrays(c.g.TRIANGLE_STRIP, 0, 4); }, [t]);
  return <canvas ref={ref} width={400} height={400} style={{ position: "absolute", right: 200, bottom: 240, width: 400, height: 400, borderRadius: "50%", transform: `rotate(${t * 20}deg)` }} />;
}
