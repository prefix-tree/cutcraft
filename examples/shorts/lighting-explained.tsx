import { z } from "zod";

import { Caption, Captions, Composition, Layer, Three, type ThreeSetupFunction, Track, useLayer } from "@cutcraft/kit";

// Every lighting trick a game uses, one at a time. Each trick gets the same small stage twice: on top without the
// trick, underneath with it. This file holds the opening and the first three; the rest follow the same pattern.
export const schema = z.object({ hook: z.string(), stage: z.string(), accent: z.string() });
export const defaults = { hook: "None of this light is real.", stage: "#ddd6c8", accent: "#ff7a3d" };

const GROUND = "#0d0f16";
/** Where the two stages sit in the 1920 px tall frame, and how many pixels one unit of the stage is. */
const TOP = 630;
const BOTTOM = 1130;
const MIDDLE = 900;
const ZOOM = 150;

type Setup = Parameters<ThreeSetupFunction>[0];
type Three_ = Setup["THREE"];

const smooth = (t: number, a: number, b: number): number => {
  const x = Math.min(1, Math.max(0, (t - a) / (b - a)));
  return x * x * (3 - 2 * x);
};

/** What each scene chooses: whether surfaces take light at all, and where on the frame the stage sits. */
interface StageOptions {
  readonly lit: boolean;
  readonly at: number;
  readonly colour: string;
  /** Pixels to one unit of the stage; the opening shows one stage, larger. */
  readonly zoom?: number;
}

/**
 * The stage every trick is shown on: a floor of sixteen tiles and three blocks, seen from the same corner. Returns
 * a function that puts the camera where the stage lands at `at` pixels down the frame.
 */
function stage({ scene, camera, THREE }: Setup, options: StageOptions) {
  const paint = (shade: number) => {
    const colour = new THREE.Color(options.colour).multiplyScalar(shade);
    return options.lit
      ? new THREE.MeshStandardMaterial({ color: colour, roughness: 0.95 })
      : new THREE.MeshBasicMaterial({ color: colour });
  };
  const tile = paint(0.9);
  const block = paint(1);
  const add = (size: [number, number, number], at: [number, number, number], material: typeof tile) => {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(...size), material);
    mesh.position.set(...at);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    scene.add(mesh);
    return mesh;
  };
  for (let x = 0; x < 4; x++) for (let z = 0; z < 4; z++) add([0.94, 0.16, 0.94], [x - 1.5, -0.08, z - 1.5], tile);
  add([0.7, 0.7, 0.7], [-0.5, 0.35, -0.5], block);
  add([0.6, 1.1, 0.6], [0.5, 0.55, 0.5], block);
  add([0.6, 0.45, 0.6], [-1.5, 0.225, 0.5], block);

  const up = new THREE.Vector3();
  return () => {
    camera.position.set(14, 12.5, 14);
    camera.lookAt(0, 0.25, 0);
    // Moving the camera up its own "up" moves the stage down the frame.
    up.set(0, 1, 0).applyQuaternion(camera.quaternion);
    camera.position.addScaledVector(up, (options.at - 960) / (options.zoom ?? ZOOM));
    (camera as InstanceType<Three_["OrthographicCamera"]>).zoom = options.zoom ?? ZOOM;
    (camera as InstanceType<Three_["OrthographicCamera"]>).updateProjectionMatrix();
  };
}

/** A sun: a light with or without shadows, and a marker in the scene that shows where it is and which way it shines. */
function sun({ scene, renderer, THREE }: Setup, options: { shadows: boolean; accent: string; marker?: boolean }) {
  const light = new THREE.DirectionalLight("#fff3df", 3.1);
  if (options.shadows) {
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    light.castShadow = true;
    light.shadow.mapSize.set(2048, 2048);
    light.shadow.bias = -0.0005;
    light.shadow.normalBias = 0.02;
    light.shadow.radius = 4;
    const view = light.shadow.camera;
    view.left = -3.4;
    view.right = 3.4;
    view.top = 3.4;
    view.bottom = -3.4;
    view.near = 0.5;
    view.far = 14;
  }
  scene.add(light, light.target);
  const marker = new THREE.Group();
  const ink = new THREE.MeshBasicMaterial({ color: options.accent });
  const ball = new THREE.Mesh(new THREE.SphereGeometry(0.2, 32, 24), ink);
  const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.75, 16), ink);
  shaft.position.y = -0.72;
  const head = new THREE.Mesh(new THREE.ConeGeometry(0.11, 0.26, 24), ink);
  head.position.y = -1.2;
  head.rotation.x = Math.PI;
  marker.add(ball, shaft, head);
  if (options.marker !== false) scene.add(marker);
  const down = new THREE.Vector3(0, -1, 0);
  const aim = new THREE.Vector3();
  /** Puts the sun at a compass angle and a height above the horizon, both in radians. */
  const place = (around: number, height: number, strength = 1) => {
    aim.set(Math.cos(around) * Math.cos(height), Math.sin(height), Math.sin(around) * Math.cos(height));
    light.position.copy(aim).multiplyScalar(7);
    light.intensity = 3.1 * strength;
    marker.position
      .copy(aim)
      .multiplyScalar(3.1)
      .setY(aim.y * 3.1 + 0.2);
    marker.quaternion.setFromUnitVectors(down, aim.clone().negate());
  };
  return { place, light, marker };
}

/** The sun's swing over a scene: back and forth across the side of the stage the camera is on. */
const swing = (time: number): number => Math.PI / 4 + 0.72 * Math.sin(time * 0.95);

/**
 * A picture in the corner of what the sun sees: the scene drawn from the sun, each pixel as bright as it is near.
 * This is the shadow map itself. A surface farther from the sun than the picture says at that spot is in shadow.
 */
function sunView(
  { scene, camera, renderer, THREE }: Setup,
  light: { position: { x: number; y: number; z: number } },
  marker: { visible: boolean },
  accent: string,
) {
  const target = new THREE.WebGLRenderTarget(512, 512);
  const eye = new THREE.OrthographicCamera(-3.1, 3.1, 3.1, -3.1, 2.5, 11.5);
  const depth = new THREE.MeshDepthMaterial();
  const card = new THREE.Group();
  const picture = new THREE.Mesh(
    new THREE.PlaneGeometry(1.4, 1.4),
    new THREE.MeshBasicMaterial({ map: target.texture, toneMapped: false }),
  );
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(1.4, 1.4), new THREE.MeshBasicMaterial({ color: "#000000" }));
  ground.position.z = -0.01;
  const edge = new THREE.Mesh(new THREE.PlaneGeometry(1.5, 1.5), new THREE.MeshBasicMaterial({ color: accent }));
  edge.position.z = -0.02;
  card.add(edge, ground, picture);
  scene.add(card);
  const right = new THREE.Vector3();
  const up = new THREE.Vector3();
  const toward = new THREE.Vector3();
  return {
    draw: () => {
      // Where the card sits: to the right of the stage and below it, facing the camera, in front of everything.
      right.set(1, 0, 0).applyQuaternion(camera.quaternion);
      up.set(0, 1, 0).applyQuaternion(camera.quaternion);
      toward.set(0, 0, 1).applyQuaternion(camera.quaternion);
      card.position.set(0, 0.25, 0).addScaledVector(right, 1.9).addScaledVector(up, -1.35).addScaledVector(toward, 8);
      card.quaternion.copy(camera.quaternion);
      eye.position.set(light.position.x, light.position.y, light.position.z);
      eye.lookAt(0, 0, 0);
      card.visible = false;
      const shown = marker.visible;
      marker.visible = false;
      scene.overrideMaterial = depth;
      renderer.setRenderTarget(target);
      renderer.clear();
      renderer.render(scene, eye);
      renderer.setRenderTarget(null);
      scene.overrideMaterial = null;
      marker.visible = shown;
      card.visible = true;
    },
    dispose: () => target.dispose(),
  };
}

const scenes = {
  /** The opening: everything on. */
  hook:
    (colour: string, accent: string): ThreeSetupFunction =>
    (ctx) => {
      const frame = stage(ctx, { lit: true, at: MIDDLE, colour, zoom: 180 });
      const { place } = sun(ctx, { shadows: true, accent });
      ctx.scene.add(new ctx.THREE.HemisphereLight("#b9c8ff", "#7d6f5d", 0.9));
      return ({ time }) => {
        frame();
        place(swing(time + 1), 0.85);
      };
    },
  /** Paint only. Nothing says which way a face points, so the blocks all but vanish. */
  flat:
    (colour: string, at: number): ThreeSetupFunction =>
    (ctx) => {
      const frame = stage(ctx, { lit: false, at, colour });
      return () => frame();
    },
  /** One sun, with or without shadows, and with the given share of flat fill light. */
  sunlit:
    (
      colour: string,
      accent: string,
      at: number,
      options: { shadows: boolean; fill?: boolean; sunView?: boolean },
    ): ThreeSetupFunction =>
    (ctx) => {
      const frame = stage(ctx, { lit: true, at, colour });
      const { place, light, marker } = sun(ctx, { shadows: options.shadows, accent });
      const fill = new ctx.THREE.AmbientLight("#ffffff", 0);
      ctx.scene.add(fill);
      const view = options.sunView ? sunView(ctx, light, marker, accent) : null;
      return {
        update: ({ time }) => {
          frame();
          place(swing(time), 0.8);
          // The fill comes up after a moment, so the black shadows are seen first.
          fill.intensity = options.fill ? 0.75 * smooth(time, 1.6, 3.2) : 0;
          view?.draw();
        },
        dispose: () => view?.dispose(),
      };
    },
};

export default function Video({ hook, stage: colour, accent }: z.infer<typeof schema>) {
  return (
    <Composition fps={30} width={1080} height={1920} background={{ mode: "color", color: GROUND }}>
      <Track id="scenes" layout="free">
        <Three id="hook" start={0} duration={3} camera={{ orthographic: true }} setup={scenes.hook(colour, accent)} />

        <Three
          id="direct-off"
          start={3}
          duration={7}
          camera={{ orthographic: true }}
          setup={scenes.flat(colour, TOP)}
        />
        <Three
          id="direct-on"
          start={3}
          duration={7}
          camera={{ orthographic: true }}
          setup={scenes.sunlit(colour, accent, BOTTOM, { shadows: false })}
        />

        <Three
          id="shadow-off"
          start={10}
          duration={8}
          camera={{ orthographic: true }}
          setup={scenes.sunlit(colour, accent, TOP, { shadows: false })}
        />
        <Three
          id="shadow-on"
          start={10}
          duration={8}
          camera={{ orthographic: true }}
          setup={scenes.sunlit(colour, accent, BOTTOM, { shadows: true, sunView: true })}
        />

        <Three
          id="ambient-off"
          start={18}
          duration={7}
          camera={{ orthographic: true }}
          setup={scenes.sunlit(colour, accent, TOP, { shadows: true })}
        />
        <Three
          id="ambient-on"
          start={18}
          duration={7}
          camera={{ orthographic: true }}
          setup={scenes.sunlit(colour, accent, BOTTOM, { shadows: true, fill: true })}
        />
      </Track>

      <Track id="labels" layout="free">
        <Layer id="direct" start={3} duration={7}>
          <Concept n={1} label="Direct light" accent={accent} />
        </Layer>
        <Layer id="shadow" start={10} duration={8}>
          <Concept n={2} label="Shadow map" accent={accent} note="What the sun sees" />
        </Layer>
        <Layer id="ambient" start={18} duration={7}>
          <Concept n={3} label="Ambient light" accent={accent} />
        </Layer>
      </Track>

      {/* What is said, as ordinary subtitles at the top: only how each trick works. */}
      <Captions
        id="subtitles"
        style={{ font: "Inter", size: 52, weight: 700, color: "#ffffff", background: "#000000c0", position: "top" }}
      >
        <Caption id="s-hook" start={0.2} end={2.9} text={hook} />
        <Caption id="s-1a" start={3.2} end={6.4} text="A surface that faces the light gets brighter." />
        <Caption id="s-1b" start={6.4} end={9.8} text="That is all direct light is." />
        <Caption id="s-2a" start={10.2} end={14} text="The scene is drawn once from the sun." />
        <Caption id="s-2b" start={14} end={17.8} text="What the sun cannot see is in shadow." />
        <Caption id="s-3a" start={18.2} end={21.4} text="Real light bounces into every shadow." />
        <Caption id="s-3b" start={21.4} end={24.8} text="Games add one flat colour instead." />
      </Captions>
    </Composition>
  );
}

const FONT = "'Space Grotesk', 'Inter', sans-serif";

/** The name of the trick under the two stages, and a tag on each stage saying which is which. */
function Concept({ n, label, accent, note }: { n: number; label: string; accent: string; note?: string }) {
  const { elapsed, remaining } = useLayer();
  const show = Math.min(smooth(elapsed, 0, 0.4), smooth(remaining, 0, 0.25));
  const tag = (top: number, text: string, on: boolean) => (
    <div
      style={{
        position: "absolute",
        left: 84,
        top,
        padding: "8px 20px",
        borderRadius: 30,
        fontSize: 30,
        fontWeight: 600,
        letterSpacing: "0.08em",
        color: on ? "#14161f" : "#9a9eac",
        background: on ? accent : "#23262f",
      }}
    >
      {text}
    </div>
  );
  return (
    <div style={{ position: "absolute", inset: 0, opacity: show, fontFamily: FONT }}>
      {tag(TOP - 250, "WITHOUT", false)}
      {tag(BOTTOM - 250, "WITH", true)}
      {note ? (
        // Under the picture the scene draws in its corner (see sunView).
        <div
          style={{
            position: "absolute",
            left: 540 + 1.9 * ZOOM - 160,
            width: 320,
            top: BOTTOM + 1.35 * ZOOM + 0.75 * ZOOM + 14,
            textAlign: "center",
            fontSize: 28,
            fontWeight: 600,
            color: accent,
          }}
        >
          {note}
        </div>
      ) : null}
      <div
        style={{
          position: "absolute",
          left: 84,
          right: 150,
          top: 1392,
          transform: `translateY(${(1 - smooth(elapsed, 0, 0.4)) * 24}px)`,
        }}
      >
        <div style={{ fontSize: 30, fontWeight: 600, letterSpacing: "0.16em", color: accent }}>TRICK {n}</div>
        <div style={{ fontSize: 92, fontWeight: 700, lineHeight: 1.05, letterSpacing: "-0.02em", color: "#f4f1ea" }}>
          {label}
        </div>
      </div>
    </div>
  );
}
