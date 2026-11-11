import { z } from "zod";

import { Caption, Captions, Composition, Effect, Keyframe, Layer, Three, Track, useLayer } from "@cutcraft/kit";

// What a person may change without touching the film: the words, and the two wall colours the bounce light picks up.
export const schema = z.object({
  hook: z.string(),
  outro: z.string(),
  warmWall: z.string(),
  coolWall: z.string(),
});
export const defaults = {
  hook: "None of this light is real.",
  outro: "5 tricks. 0 real light.",
  warmWall: "#c9523a",
  coolWall: "#2c8f86",
};

// The film's clock, in seconds. Each trick switches on at its time and stays on; the film ends as it began, with
// all five on, so it loops. The elements below are placed at these same times, written out as numbers so that an
// editor can move them; a trick's words and its `at` here are kept in step by hand.
const LENGTH = 30;
const STRIP = 2.6; // everything switches off
const FADE = 0.9;
const TRICKS = [
  { at: 5, name: "Direct light" },
  { at: 9.5, name: "Shadows" },
  { at: 14, name: "Bounce light" },
  { at: 18.5, name: "Ambient occlusion" },
  { at: 23, name: "Bloom" },
] as const;

const smooth = (t: number, a: number, b: number): number => {
  const x = Math.min(1, Math.max(0, (t - a) / (b - a)));
  return x * x * (3 - 2 * x);
};
/** How much trick `i` is on at `time`: fully in the opening, off after the strip, back on from its own time. */
const on = (i: number, time: number): number =>
  Math.max(
    1 - smooth(time, STRIP, STRIP + FADE),
    smooth(time, (TRICKS[i] as { at: number }).at, (TRICKS[i] as { at: number }).at + FADE),
  );

export default function Video({ hook, outro, warmWall, coolWall }: z.infer<typeof schema>) {
  return (
    <Composition fps={30} width={1080} height={1920} background={{ mode: "color", color: "#0d0f16" }}>
      <Track id="scene" layout="free">
        <Three
          id="room"
          start={0}
          duration={30}
          background="#0d0f16"
          camera={{ position: [14.8, 13, 16.9], lookAt: [0, 1.75, 0], fov: 32 }}
          setup={({ scene, camera, renderer, THREE }) => {
            renderer.shadowMap.enabled = true;
            renderer.shadowMap.type = THREE.PCFSoftShadowMap;

            // The room: a floor, two walls, and things that cast shadows and make corners. Every solid is also kept
            // as a box or a ball, which is all the occlusion bake below needs to know.
            type Box = { min: [number, number, number]; max: [number, number, number] };
            const boxes: Box[] = [];
            const balls: { c: [number, number, number]; r: number }[] = [];
            const baked: { mesh: InstanceType<typeof THREE.Mesh>; ao: Float32Array }[] = [];
            const solid = (
              geometry: InstanceType<typeof THREE.BufferGeometry>,
              colour: string,
              at: [number, number, number],
              shadows = true,
            ) => {
              const material = new THREE.MeshStandardMaterial({ color: colour, roughness: 0.92, vertexColors: true });
              const mesh = new THREE.Mesh(geometry, material);
              mesh.position.set(...at);
              mesh.castShadow = shadows;
              mesh.receiveShadow = true;
              scene.add(mesh);
              baked.push({ mesh, ao: new Float32Array(geometry.getAttribute("position").count) });
              return mesh;
            };
            const box = (size: [number, number, number], colour: string, at: [number, number, number]) => {
              // Enough vertices that a baked shadow can fade across a face.
              const cuts = size.map((s) => Math.max(2, Math.round(s * 6))) as [number, number, number];
              solid(new THREE.BoxGeometry(...size, ...cuts), colour, at);
              boxes.push({
                min: [at[0] - size[0] / 2, at[1] - size[1] / 2, at[2] - size[2] / 2],
                max: [at[0] + size[0] / 2, at[1] + size[1] / 2, at[2] + size[2] / 2],
              });
            };

            const floor = solid(new THREE.PlaneGeometry(6.4, 6.4, 96, 96), "#b8b0a2", [0, 0, 0], false);
            floor.rotation.x = -Math.PI / 2;
            const warm = solid(new THREE.PlaneGeometry(6.4, 4.4, 80, 56), warmWall, [-3.2, 2.2, 0], false);
            warm.rotation.y = Math.PI / 2;
            solid(new THREE.PlaneGeometry(6.4, 4.4, 80, 56), coolWall, [0, 2.2, -3.2], false);
            boxes.push({ min: [-3.2, -1, -3.2], max: [3.2, 0, 3.2] });
            boxes.push({ min: [-4.2, 0, -3.2], max: [-3.2, 4.4, 3.2] });
            boxes.push({ min: [-3.2, 0, -4.2], max: [3.2, 4.4, -3.2] });
            // The slab the room stands on, so it reads as a model on a table.
            const slab = new THREE.Mesh(
              new THREE.BoxGeometry(6.4, 0.5, 6.4),
              new THREE.MeshStandardMaterial({ color: "#6d675e", roughness: 1 }),
            );
            slab.position.set(0, -0.26, 0);
            scene.add(slab);

            // Crates in the corner, two steps, a pillar with a lamp on it, and a ball.
            box([1.5, 1.5, 1.5], "#d9c9a3", [-2.3, 0.75, -2.3]);
            box([1, 1, 1], "#e2d6b8", [-2.35, 2, -2.35]);
            box([1.1, 1.1, 1.1], "#cdbb93", [-0.85, 0.55, -2.5]);
            box([1.9, 0.4, 1.5], "#a9a39a", [1.9, 0.2, -2.3]);
            box([1.9, 0.4, 0.8], "#a9a39a", [1.9, 0.6, -2.65]);
            box([0.6, 2.6, 0.6], "#d8d2c6", [-2.4, 1.3, 1.1]);
            box([0.95, 0.2, 0.95], "#c4beb2", [-2.4, 2.7, 1.1]);
            const ball = solid(new THREE.SphereGeometry(0.72, 48, 32), "#e9e4da", [1.1, 0.72, 0.2]);
            balls.push({ c: [ball.position.x, ball.position.y, ball.position.z], r: 0.72 });

            // The lamp: a bulb that is simply painted bright. It lights nothing by itself; a small light beside it does.
            const bulb = new THREE.Mesh(
              new THREE.SphereGeometry(0.3, 32, 24),
              new THREE.MeshBasicMaterial({ color: "#ffd89a" }),
            );
            bulb.position.set(-2.4, 3.12, 1.1);
            scene.add(bulb);

            // Bake ambient occlusion into each vertex: from the vertex, look out along the same spread of directions
            // and see how many are blocked nearby, and how near. No randomness, so every render bakes the same.
            const RAYS = 160;
            const REACH = 1.1;
            const dirs: [number, number, number][] = [];
            for (let i = 0; i < RAYS; i++) {
              const y = 1 - ((i + 0.5) / RAYS) * 2;
              const a = i * Math.PI * (3 - Math.sqrt(5));
              const r = Math.sqrt(1 - y * y);
              dirs.push([Math.cos(a) * r, y, Math.sin(a) * r]);
            }
            /** How far along `d` from `o` something solid is, or more than REACH. */
            const reach = (o: [number, number, number], d: [number, number, number]): number => {
              let nearest = REACH * 2;
              for (const b of boxes) {
                let near = 0;
                let far = REACH;
                for (let k = 0; k < 3 && near <= far; k++) {
                  const inv = 1 / (d[k] || 1e-9);
                  const t1 = ((b.min[k] as number) - (o[k] as number)) * inv;
                  const t2 = ((b.max[k] as number) - (o[k] as number)) * inv;
                  near = Math.max(near, Math.min(t1, t2));
                  far = Math.min(far, Math.max(t1, t2));
                }
                if (near <= far) nearest = Math.min(nearest, near);
              }
              for (const s of balls) {
                const x = o[0] - s.c[0];
                const y = o[1] - s.c[1];
                const z = o[2] - s.c[2];
                const b = x * d[0] + y * d[1] + z * d[2];
                const h = b * b - (x * x + y * y + z * z - s.r * s.r);
                if (h >= 0 && -b - Math.sqrt(h) >= 0) nearest = Math.min(nearest, -b - Math.sqrt(h));
              }
              return nearest;
            };
            const p = new THREE.Vector3();
            const n = new THREE.Vector3();
            for (const { mesh, ao } of baked) {
              mesh.updateMatrixWorld();
              const positions = mesh.geometry.getAttribute("position");
              const normals = mesh.geometry.getAttribute("normal");
              mesh.geometry.setAttribute(
                "color",
                new THREE.BufferAttribute(new Float32Array(positions.count * 3).fill(1), 3),
              );
              for (let i = 0; i < positions.count; i++) {
                p.fromBufferAttribute(positions, i).applyMatrix4(mesh.matrixWorld);
                n.fromBufferAttribute(normals, i).transformDirection(mesh.matrixWorld);
                // Start a little off the surface, so a vertex does not block itself.
                const o: [number, number, number] = [p.x + n.x * 0.03, p.y + n.y * 0.03, p.z + n.z * 0.03];
                let dark = 0;
                let weight = 0;
                for (const d of dirs) {
                  const facing = d[0] * n.x + d[1] * n.y + d[2] * n.z;
                  if (facing <= 0.05) continue;
                  weight += facing;
                  const far = reach(o, d);
                  // Something close darkens more than something at arm's length.
                  if (far < REACH) dark += facing * (1 - far / REACH);
                }
                ao[i] = 1 - Math.min(0.85, (dark / weight) * 1.9);
              }
            }

            // The lights. `flat` is the scene with no lighting at all: every surface shows its paint.
            const flat = new THREE.AmbientLight("#ffffff", 0);
            const sunPlain = new THREE.DirectionalLight("#fff1dc", 0);
            const sunShadowed = new THREE.DirectionalLight("#fff1dc", 0);
            for (const sun of [sunPlain, sunShadowed]) sun.position.set(7.5, 8.5, 2.8);
            sunShadowed.castShadow = true;
            sunShadowed.shadow.mapSize.set(2048, 2048);
            sunShadowed.shadow.bias = -0.0006;
            sunShadowed.shadow.normalBias = 0.03;
            sunShadowed.shadow.radius = 5;
            const view = sunShadowed.shadow.camera;
            view.left = -6;
            view.right = 6;
            view.top = 6;
            view.bottom = -6;
            view.near = 1;
            view.far = 30;
            const lamp = new THREE.PointLight("#ffc87a", 0, 6, 2);
            lamp.position.copy(bulb.position);
            const sky = new THREE.HemisphereLight("#9fb7ff", "#8a7a66", 0);
            const fromWarm = new THREE.PointLight(warmWall, 0, 8, 1.6);
            fromWarm.position.set(-2.1, 1.4, -0.2);
            const fromCool = new THREE.PointLight(coolWall, 0, 8, 1.6);
            fromCool.position.set(0.6, 1.4, -1.9);
            scene.add(flat, sunPlain, sunShadowed, lamp, sky, fromWarm, fromCool);

            let aoShown = -1;
            return ({ time }) => {
              const [direct, shadows, bounce, occlusion] = [0, 1, 2, 3].map((i) => on(i, time)) as [
                number,
                number,
                number,
                number,
              ];
              flat.intensity = 2.6 * (1 - direct) + 0.1 * direct;
              sunPlain.intensity = 3.2 * direct * (1 - shadows);
              sunShadowed.intensity = 3.2 * direct * shadows;
              lamp.intensity = 14 * direct;
              sky.intensity = 0.9 * bounce;
              fromWarm.intensity = 7 * bounce;
              fromCool.intensity = 5 * bounce;
              if (Math.abs(occlusion - aoShown) > 1e-4) {
                aoShown = occlusion;
                for (const { mesh, ao } of baked) {
                  const colours = mesh.geometry.getAttribute("color");
                  for (let i = 0; i < ao.length; i++) {
                    const v = 1 - occlusion * (1 - (ao[i] as number));
                    colours.setXYZ(i, v, v, v);
                  }
                  colours.needsUpdate = true;
                }
              }
              // A slow swing around the room that ends where it starts.
              const swing = 0.22 * Math.sin((time / LENGTH) * Math.PI * 2);
              const angle = 0.72 + swing;
              camera.position.set(Math.sin(angle) * 22.5, 13, Math.cos(angle) * 22.5);
              camera.lookAt(0, 1.75, 0);
            };
          }}
        >
          {/* Bloom is not in the room at all: it is done to the finished picture. */}
          <Effect id="bloom" type="glow" params={{ radius: 36, intensity: 0, threshold: 0.86, tint: 0 }}>
            <Keyframe id="bloom-a" param="intensity" at={0} value={1.5} />
            <Keyframe id="bloom-b" param="intensity" at={2.6} value={1.5} />
            <Keyframe id="bloom-c" param="intensity" at={3.5} value={0} />
            <Keyframe id="bloom-d" param="intensity" at={23} value={0} />
            <Keyframe id="bloom-e" param="intensity" at={23.9} value={1.5} />
          </Effect>
        </Three>
      </Track>

      <Track id="switches" layout="free">
        <Layer id="list" start={0} duration={30}>
          <Switches />
        </Layer>
      </Track>

      {/* What is said, as ordinary subtitles at the top: only how each trick works. */}
      <Captions
        id="subtitles"
        style={{ font: "Inter", size: 54, weight: 700, color: "#ffffff", background: "#000000c0", position: "top" }}
      >
        <Caption id="s-hook" start={0.2} end={2.8} text={hook} />
        <Caption id="s-bare" start={3.1} end={4.9} text="Here is the room with no lighting. Just paint." />
        <Caption id="s-1a" start={5} end={7.1} text="Direct light: one sun." />
        <Caption id="s-1b" start={7.1} end={9.3} text="A surface that faces it gets brighter." />
        <Caption id="s-2a" start={9.5} end={11.6} text="Shadows: a picture taken from the sun." />
        <Caption id="s-2b" start={11.6} end={13.8} text="What the sun cannot see goes dark." />
        <Caption id="s-3a" start={14} end={16.1} text="Bounce light: small coloured lights" />
        <Caption id="s-3b" start={16.1} end={18.3} text="stand in for light bouncing off the walls." />
        <Caption id="s-4a" start={18.5} end={20.6} text="Ambient occlusion: corners and gaps" />
        <Caption id="s-4b" start={20.6} end={22.8} text="are darkened ahead of time. No light involved." />
        <Caption id="s-5a" start={23} end={24.9} text="Bloom: bright pixels are blurred" />
        <Caption id="s-5b" start={24.9} end={26.8} text="and added on top. Now the lamp glows." />
        <Caption id="s-outro" start={27} end={29.8} text={outro} />
      </Captions>
    </Composition>
  );
}

const FONT = "'Space Grotesk', 'Inter', sans-serif";
const ACCENT = "#ffc857";

/** The five tricks as lamps in a row, each lit while its trick is on. */
function Switches() {
  const { time } = useLayer();
  return (
    <div
      style={{
        position: "absolute",
        left: 84,
        right: 150,
        bottom: 410,
        display: "flex",
        flexWrap: "wrap",
        gap: "16px 14px",
        fontFamily: FONT,
        fontSize: 32,
        fontWeight: 600,
      }}
    >
      {TRICKS.map((trick, i) => {
        const k = on(i, time);
        return (
          <div
            key={trick.name}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 14,
              padding: "12px 24px 12px 18px",
              borderRadius: 40,
              color: `color-mix(in srgb, #14161f ${Math.round(k * 100)}%, #8b8f9e)`,
              background: `color-mix(in srgb, ${ACCENT} ${Math.round(k * 100)}%, #23262f)`,
            }}
          >
            <div
              style={{
                width: 18,
                height: 18,
                borderRadius: 9,
                background: `color-mix(in srgb, #14161f ${Math.round(k * 100)}%, #555a69)`,
              }}
            />
            {trick.name}
          </div>
        );
      })}
    </div>
  );
}
