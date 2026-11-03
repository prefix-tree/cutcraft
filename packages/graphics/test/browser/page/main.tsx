// A Player with free code in three Layers: a three.js scene, a Motion timeline and a CSS animation. The test seeks it.
import { Composition, Layer, Motion, Three, Track, collect, resolve } from "@cutcraft/kit";
import { Player, type PlayerRef } from "@cutcraft/player";
import { useFrame } from "@react-three/fiber";
import { createRef, useRef } from "react";
import { createRoot } from "react-dom/client";
import type { Mesh, MeshBasicMaterial } from "three";
import { useLayerTime, useTimeline } from "../../../src/libraries/motion";
import { ThreeScene } from "../../../src/libraries/three";
import { useTransform, motion } from "motion/react";
import { installFreeCodeLibraries } from "../../../src/libraries";

installFreeCodeLibraries();

declare global { interface Window { __ready?: boolean; __seek(t: number): Promise<void> } }

// R3F creates its renderer after the canvas mounts; a seek before then draws nothing.
let sceneReady = false;

function Plane() {
  const mesh = useRef<Mesh>(null);
  // Red rises with the layer's clock: 0 at its start, 1 after four seconds.
  useFrame((state) => { (mesh.current!.material as MeshBasicMaterial).color.setRGB(Math.min(1, state.clock.elapsedTime / 4), 0, 0); });
  return <mesh ref={mesh}><planeGeometry args={[100, 100]} /><meshBasicMaterial /></mesh>;
}

function Timeline() {
  const scope = useTimeline([[".box", { opacity: [0, 1] }, { duration: 2, ease: "linear" }]]);
  const time = useLayerTime();
  const x = useTransform(time, [0, 4], [0, 400]);
  return (
    <div ref={scope}>
      <div className="box" id="motion-box" style={{ position: "absolute", width: 50, height: 50, background: "#fff" }} />
      <motion.div id="motion-value" style={{ position: "absolute", top: 60, width: 50, height: 50, background: "#0f0", x }} />
    </div>
  );
}

function Keyframes() {
  return (
    <>
      <style>{"@keyframes cc-fade { from { opacity: 0 } to { opacity: 1 } }"}</style>
      <div id="css-box" style={{ position: "absolute", top: 120, width: 50, height: 50, background: "#00f", animation: "cc-fade 2s linear forwards" }} />
    </>
  );
}

const element = (
  <Composition fps={30} width={640} height={360}>
    <Track id="free" layout="free">
      <Layer id="three" start={0} duration={4}><ThreeScene camera={{ position: [0, 0, 5] }} onCreated={() => { sceneReady = true; }}><Plane /></ThreeScene></Layer>
      <Layer id="motion" start={0} duration={4}><Timeline /></Layer>
      <Layer id="css" start={0} duration={4}><Keyframes /></Layer>
      {/* The tags, as a file writes them: plain three.js pasted into setup, and a Motion sequence. */}
      <Three id="plain" start={0} duration={4} camera={{ position: [0, 0, 5] }} setup={({ scene, THREE }) => {
        const material = new THREE.MeshBasicMaterial();
        scene.add(new THREE.Mesh(new THREE.PlaneGeometry(100, 100), material));
        return ({ time }) => { material.color.setRGB(0, Math.min(1, time / 4), 0); };
      }} />
      <Motion id="tagged" start={0} duration={4} sequence={[["#tagged-box", { opacity: [0, 1] }, { duration: 2, ease: "linear" }]]}>
        <div id="tagged-box" style={{ position: "absolute", top: 180, width: 50, height: 50, background: "#ff0" }} />
      </Motion>
    </Track>
  </Composition>
);
const state = resolve(collect(element), { assets: {} });
const ref = createRef<PlayerRef>();
createRoot(document.getElementById("root")!).render(<Player ref={ref} state={state} element={element} media={{}} fit="none" controls={false} />);

const frames = (n: number): Promise<void> => new Promise((r) => { const step = (): void => { if (--n <= 0) r(); else requestAnimationFrame(step); }; requestAnimationFrame(step); });
window.__seek = async (t) => { await ref.current!.seekTo(t); await frames(3); };
// The <Three> tag's canvas is ready once a seek draws its green.
const plainDrawn = (): boolean => {
  const gl = document.querySelector<HTMLCanvasElement>(`[data-el="plain"] canvas`);
  if (!gl) return false;
  const probe = document.createElement("canvas"); probe.width = gl.width; probe.height = gl.height;
  const ctx = probe.getContext("2d")!; ctx.drawImage(gl, 0, 0);
  return ctx.getImageData(gl.width >> 1, gl.height >> 1, 1, 1).data[1]! > 0;
};
const wait = async (): Promise<void> => {
  if (ref.current && sceneReady && document.querySelector("#motion-box")) {
    await window.__seek(2);
    if (plainDrawn()) { window.__ready = true; return; }
  }
  requestAnimationFrame(() => void wait());
};
void wait();
