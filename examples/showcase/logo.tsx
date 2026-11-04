import { z } from "zod";

import { Composition, Motion, Three, Track } from "@cutcraft/kit";

export const schema = z.object({ name: z.string(), tagline: z.string(), accent: z.string() });
export const defaults = { name: "Shed", tagline: "A cloud for small software", accent: "#e8a33d" };

/**
 * A logo reveal for an intro or outro: three.js particles drift in and settle into the name, which then hands off
 * to a lower third. Every particle's place is a function of time, so the export draws exactly what the preview shows.
 */
export default function Video({ name, tagline, accent }: z.infer<typeof schema>) {
  return (
    <Composition fps={30} width={960} height={540} theme={{ extends: "midnight", palette: { primary: accent } }}>
      <Track id="scene" name="Scene" layout="free">
        <Three
          id="particles"
          start={0}
          duration={6}
          background="#101421"
          camera={{ position: [0, 0, 10], fov: 40 }}
          setup={({ scene, THREE }) => {
            // Where the particles end: points sampled from the name drawn on a canvas.
            const W = 480;
            const H = 160;
            const art = document.createElement("canvas");
            art.width = W;
            art.height = H;
            const g = art.getContext("2d") as CanvasRenderingContext2D;
            g.fillStyle = "#fff";
            g.font = "700 132px 'Space Grotesk', sans-serif";
            g.textAlign = "center";
            g.textBaseline = "middle";
            g.fillText(name, W / 2, H / 2);
            const pixels = g.getImageData(0, 0, W, H).data;
            const targets: number[] = [];
            for (let y = 0; y < H; y += 3)
              for (let x = 0; x < W; x += 3)
                if ((pixels[(y * W + x) * 4 + 3] as number) > 128) targets.push((x - W / 2) / 48, (H / 2 - y) / 48, 0);

            // Seeded, so every run (and every export) scatters the same way.
            let seed = 7;
            const random = () => {
              seed = (seed * 16807) % 2147483647;
              return seed / 2147483647;
            };
            const count = 3000;
            const from = new Float32Array(count * 3);
            const to = new Float32Array(count * 3);
            const delay = new Float32Array(count);
            for (let i = 0; i < count; i++) {
              const k = (i % (targets.length / 3)) * 3;
              to.set([targets[k] as number, targets[k + 1] as number, targets[k + 2] as number], i * 3);
              const r = 6 + random() * 6;
              const a = random() * Math.PI * 2;
              from.set([Math.cos(a) * r, Math.sin(a) * r * 0.6, (random() - 0.5) * 8], i * 3);
              delay[i] = random() * 0.8;
            }
            const positions = new Float32Array(count * 3);
            const geometry = new THREE.BufferGeometry();
            geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
            const points = new THREE.Points(geometry, new THREE.PointsMaterial({ color: accent, size: 0.07 }));
            scene.add(points);
            return ({ time }) => {
              for (let i = 0; i < count; i++) {
                const p = Math.min(1, Math.max(0, (time - (delay[i] as number)) / 1.8));
                const e = 1 - (1 - p) ** 4;
                for (let c = 0; c < 3; c++) {
                  const j = i * 3 + c;
                  positions[j] = (from[j] as number) + ((to[j] as number) - (from[j] as number)) * e;
                }
              }
              geometry.attributes.position.needsUpdate = true;
              points.rotation.y = Math.max(0, 2.6 - time) * 0.12;
              // Once settled, the name lifts to make room for the lower third.
              points.position.y = Math.min(1, Math.max(0, (time - 3) / 0.6)) * 0.8;
            };
          }}
        />
      </Track>
      <Track id="text" name="Text" layout="free">
        <Motion
          id="tagline"
          start={3.2}
          duration={2.8}
          sequence={[
            [".rule", { scaleX: [0, 1] }, { duration: 0.5, ease: "easeOut" }],
            [".line", { opacity: [0, 1], y: [16, 0] }, { at: 0.2, duration: 0.45, ease: "easeOut" }],
          ]}
        >
          <div
            className="rule"
            style={{ position: "absolute", left: 330, width: 300, top: 352, height: 4, background: accent }}
          />
          <div
            className="line"
            style={{
              position: "absolute",
              left: 0,
              right: 0,
              top: 372,
              textAlign: "center",
              color: "#f4efe6",
              font: "500 28px Inter, sans-serif",
            }}
          >
            {tagline}
          </div>
        </Motion>
      </Track>
    </Composition>
  );
}
