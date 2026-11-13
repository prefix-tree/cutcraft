import { Caption, Captions, Composition, Effect, Keyframe, Layer, Three, Track, useLayer } from "@cutcraft/kit";

// "One pixel": how a game lights a room, told by following one dot of the screen. A narrator's words lead; the
// subtitles show them as they are said, and each thing on screen arrives on the word that names it.
//
// There is no voice in this file. The words are timed at a speaking pace, so a voice can be recorded over the film;
// if it runs differently, its transcript replaces the times worked out below and the picture follows.
//
// Two stages. The room: a small 3D room, which is what the game shows. The slice: the same room cut in half and
// seen from the side, where each trick is explained; its floor is a row of dots, each with its brightness.
//
// This file holds the opening and the first trick. The other four follow the same pattern.

const INK = "#0a0c13";
const GOLD = "#ffc857";
const CREAM = "#d9d2c4";
const RED = "#c9523a";
const SANS = "Inter, 'Helvetica Neue', Arial, sans-serif";
const MONO = "'JetBrains Mono', 'DejaVu Sans Mono', Menlo, monospace";

// ---- The narration ---------------------------------------------------------------------------------------------
// A word in [brackets] is a cue the picture listens for. (1.5) is a pause of that many seconds, with nothing said;
// {name} marks a moment by name without a word.
const SCRIPT = `
How does a video game [light] a room? (0.5)
Real light is a nightmare to copy. Every lamp throws out [billions] of rays.
Each one bounces off the walls, the floor, the ball, again and again, before it reaches your eye.
An animated film can spend [hours] working that out for a single picture.
A game has to do it sixty times every [second]. It can't. So it [cheats]. (0.7)
Your screen is millions of tiny [dots]. All the game really does is pick a colour for each one.
Let's follow [one] dot and watch how it gets its light. (0.4)
Here's the first cheat. Think of standing in the [sun]. Turn your face [towards] it and you feel the warmth.
Turn [away] and you don't. The game asks every surface the same thing: are you [facing] the lamp?
Facing it: [bright]. Turned away: [dark]. (0.8) {room} (2.4) {end}
`;

interface Said {
  readonly text: string;
  readonly start: number;
  readonly end: number;
}
/** Seconds a word takes to say at an explainer's pace, and the breath a comma or a full stop takes after it. */
const say = (word: string): number => 0.1 + 0.044 * word.replace(/[^a-z]/gi, "").length;
const breath = (word: string): number => (/[.?!:]$/.test(word) ? 0.28 : /,$/.test(word) ? 0.13 : 0);
const ms = (t: number): number => Math.round(t * 1000) / 1000;

const cue: Record<string, number> = {};
/** The subtitles: up to three words at a time, never across a comma or a full stop. */
const lines: { text: string; start: number; end: number; words: Said[] }[] = [];
{
  let t = 0.3;
  let open: Said[] = [];
  const close = () => {
    const first = open[0];
    const last = open[open.length - 1];
    if (first && last)
      lines.push({
        text: open.map((w) => w.text).join(" "),
        start: first.start,
        end: ms(last.end + 0.12),
        words: open,
      });
    open = [];
  };
  for (const raw of SCRIPT.split(/\s+/).filter(Boolean)) {
    const pause = /^\(([\d.]+)\)$/.exec(raw);
    const mark = /^\{(\w+)\}$/.exec(raw);
    if (pause) {
      close();
      t += Number(pause[1]);
    } else if (mark?.[1]) cue[mark[1]] = ms(t);
    else {
      const text = raw.replace(/[[\]]/g, "");
      const named = /\[(\w+)\]/.exec(raw);
      if (named?.[1]) cue[named[1]] = ms(t);
      const end = t + say(text);
      open.push({ text, start: ms(t), end: ms(end) });
      t = end + breath(text);
      if (open.length === 3 || breath(text) > 0) close();
    }
  }
  close();
  // A subtitle stays up for a moment after its last word, but never into the next one.
  lines.forEach((line, i) => {
    const next = lines[i + 1];
    if (next && line.end > next.start) line.end = next.start;
  });
}
const at = cue as Record<
  | "light"
  | "billions"
  | "hours"
  | "second"
  | "cheats"
  | "dots"
  | "one"
  | "sun"
  | "towards"
  | "away"
  | "facing"
  | "bright"
  | "dark"
  | "room"
  | "end",
  number
>;
const LENGTH = Math.ceil(at.end * 10) / 10;
if (typeof process !== "undefined" && process.env.ONE_PIXEL_CUES) console.error(JSON.stringify(cue));

/** 0 before `a`, 1 after `b`, eased between: how far along something is. */
const ease = (t: number, a: number, b: number): number => {
  const x = Math.min(1, Math.max(0, (t - a) / (b - a)));
  return x * x * (3 - 2 * x);
};
const mix = (a: number, b: number, k: number): number => a + (b - a) * k;

// ---- The slice ---------------------------------------------------------------------------------------------------
// Drawn in the frame's own pixels, 1080 x 1920. The room's walls, the lamp, the ball, and the floor as ten dots.
const LAMP = { x: 300, y: 640 };
const BALL = { x: 600, y: 1100, r: 80 };
const FLOOR = 1180;
const dotX = (i: number): number => 140 + 80 * i;
const OURS = 7;
/** Each dot's brightness with only "are you facing the lamp?" answered: high under the lamp, falling with distance. */
const FACING = [78, 92, 96, 90, 82, 74, 66, 58, 50, 42];

function Slice() {
  const { time } = useLayer();
  // The slice comes in as the room turns side-on, and steps aside for the room at the end of the trick.
  const here = ease(time, at.dots - 0.5, at.dots + 0.1) * (1 - ease(time, at.room - 0.25, at.room + 0.1));
  if (here <= 0) return null;
  const lampOn = ease(time, at.sun - 0.1, at.sun + 0.5);
  const counted = ease(time, at.bright, at.bright + 0.9);
  const dim = ease(time, at.dark, at.dark + 0.6);
  const framed = ease(time, at.one, at.one + 0.35);
  const pinUp = ease(time, at.towards, at.towards + 0.35);
  const rayIn = ease(time, at.towards + 0.2, at.towards + 0.7);
  const wallPin = ease(time, at.away, at.away + 0.35);
  const fan = ease(time, at.facing, at.facing + 0.8);
  const wrong = ease(time, at.dark + 0.7, at.dark + 1.3);
  const px = dotX(3) + 36;
  const glow = { filter: "drop-shadow(0 0 10px #ffc857) drop-shadow(0 0 3px #ffc857)" };
  return (
    <svg
      viewBox="0 0 1080 1920"
      width="1080"
      height="1920"
      role="img"
      aria-label="The room cut in half and seen from the side"
      style={{ position: "absolute", inset: 0, opacity: here, background: INK }}
    >
      <defs>
        <radialGradient id="op-ball" cx="34%" cy="30%" r="80%">
          <stop offset="0" stopColor="#fffaf0" />
          <stop offset=".55" stopColor="#cfc7b8" />
          <stop offset="1" stopColor="#5d584f" />
        </radialGradient>
        <radialGradient id="op-halo">
          <stop offset="0" stopColor="#fff1c9" stopOpacity=".95" />
          <stop offset=".35" stopColor={GOLD} stopOpacity=".3" />
          <stop offset="1" stopColor={GOLD} stopOpacity="0" />
        </radialGradient>
        <pattern id="op-grid" width="60" height="60" patternUnits="userSpaceOnUse">
          <path d="M60 0H0V60" fill="none" stroke="#161b2b" strokeWidth="2" />
        </pattern>
      </defs>
      <rect width="1080" height="1920" fill="url(#op-grid)" opacity=".7" />
      {/* A slow drift, so the diagram is never a still picture. */}
      <g transform={`translate(0 ${mix(18, -18, ease(time, at.dots, at.room))})`}>
        <line x1="140" y1="520" x2="940" y2="520" stroke="#6f6a60" strokeWidth="8" />
        <line x1="140" y1="516" x2="140" y2={FLOOR + 4} stroke={CREAM} strokeWidth="10" />
        <line x1="940" y1="516" x2="940" y2={FLOOR + 4} stroke={RED} strokeWidth="16" opacity={1 - 0.45 * dim} />
        <line x1="135" y1={FLOOR} x2="948" y2={FLOOR} stroke={CREAM} strokeWidth="8" />

        {/* The lamp. */}
        <line x1={LAMP.x} y1="520" x2={LAMP.x} y2={LAMP.y - 26} stroke="#555c70" strokeWidth="5" />
        <circle cx={LAMP.x} cy={LAMP.y} r={130} fill="url(#op-halo)" opacity={lampOn} />
        <circle cx={LAMP.x} cy={LAMP.y} r="26" fill={lampOn > 0.5 ? "#fff6dc" : "#8b8778"} />

        {/* "Are you facing the lamp?", asked of every dot at once. */}
        {FACING.map((_, i) => (
          <line
            // biome-ignore lint/suspicious/noArrayIndexKey: ten fixed dots.
            key={i}
            x1={LAMP.x}
            y1={LAMP.y}
            x2={mix(LAMP.x, dotX(i) + 36, fan)}
            y2={mix(LAMP.y, FLOOR, fan)}
            stroke={GOLD}
            strokeWidth="3"
            opacity={fan > 0 && i !== 3 && i !== OURS ? 0.4 * (1 - 0.5 * wrong) : 0}
          />
        ))}
        {/* One dot answers first: a pin for the way the floor faces, a ray for the way to the lamp. */}
        <line
          x1={LAMP.x}
          y1={LAMP.y}
          x2={mix(LAMP.x, px, rayIn)}
          y2={mix(LAMP.y, FLOOR, rayIn)}
          stroke={GOLD}
          strokeWidth="6"
          strokeLinecap="round"
          opacity={rayIn > 0 ? 1 : 0}
          style={glow}
        />
        <line
          x1={px}
          y1={FLOOR}
          x2={px}
          y2={FLOOR - 120 * pinUp}
          stroke="#ffffff"
          strokeWidth="6"
          strokeLinecap="round"
          opacity={pinUp > 0 ? 1 : 0}
        />
        <circle cx={px} cy={FLOOR} r={9 * pinUp} fill="#ffffff" />
        {/* The red wall is turned side-on to the lamp: its pin points across the room, not up at the light. */}
        <line
          x1="932"
          y1="860"
          x2={932 - 120 * wallPin}
          y2="860"
          stroke="#ffffff"
          strokeWidth="6"
          strokeLinecap="round"
          opacity={wallPin > 0 ? 1 : 0}
        />
        <circle cx="932" cy="860" r={9 * wallPin} fill="#ffffff" />
        <line
          x1={LAMP.x}
          y1={LAMP.y}
          x2={mix(LAMP.x, 932, wallPin)}
          y2={mix(LAMP.y, 860, wallPin)}
          stroke={GOLD}
          strokeWidth="4"
          opacity={wallPin > 0 ? 0.55 : 0}
        />
        <text
          x="870"
          y="820"
          textAnchor="middle"
          fontFamily={MONO}
          fontWeight="700"
          fontSize="40"
          fill="#ffffff"
          opacity={dim}
        >
          31
        </text>
        {/* What is wrong with this answer: the lamp's ray goes straight through the ball to our dot. */}
        <line
          x1={LAMP.x}
          y1={LAMP.y}
          x2={mix(LAMP.x, dotX(OURS) + 36, wrong)}
          y2={mix(LAMP.y, FLOOR, wrong)}
          stroke={GOLD}
          strokeWidth="5"
          strokeDasharray="12 12"
          opacity={wrong > 0 ? 1 : 0}
          style={glow}
        />

        <circle cx={BALL.x} cy={BALL.y} r={BALL.r} fill={CREAM} />
        <circle cx={BALL.x} cy={BALL.y} r={BALL.r} fill="url(#op-ball)" opacity={counted} />

        {/* The floor, as the screen has it: a row of dots, each with a number for how bright it is. */}
        {FACING.map((facing, i) => {
          const value = Math.round(mix(50, facing, ease(time, at.bright + i * 0.05, at.bright + 0.7 + i * 0.05)));
          const grey = Math.round(40 + value * 2.1);
          const shown = ease(time, at.dots + i * 0.04, at.dots + 0.4 + i * 0.04);
          return (
            // biome-ignore lint/suspicious/noArrayIndexKey: ten fixed dots.
            <g key={i} opacity={shown}>
              <rect x={dotX(i)} y="1200" width="72" height="64" rx="8" fill={`rgb(${grey},${grey},${grey})`} />
              <text
                x={dotX(i) + 36}
                y="1314"
                textAnchor="middle"
                fontFamily={MONO}
                fontWeight="700"
                fontSize="32"
                fill={i === OURS || i === 3 ? "#ffffff" : "#9aa2b8"}
              >
                {value}
              </text>
            </g>
          );
        })}
        <g opacity={framed} transform={`translate(${dotX(OURS) + 36} 1232) scale(${mix(1.8, 1, framed)})`}>
          <rect x="-43" y="-39" width="86" height="78" rx="12" fill="none" stroke="#ffffff" strokeWidth="5" />
        </g>
        <text
          x={dotX(OURS) + 36}
          y="1364"
          textAnchor="middle"
          fontFamily={SANS}
          fontWeight="600"
          fontSize="28"
          fill="#ffffff"
          opacity={framed}
        >
          our dot
        </text>
      </g>
    </svg>
  );
}

/** "A film can spend hours on one picture; a game has a sixtieth of a second": a clock, then a counter. */
function Clock() {
  const { time } = useLayer();
  const shown = ease(time, at.hours - 0.2, at.hours + 0.2) * (1 - ease(time, at.cheats - 0.1, at.cheats + 0.2));
  if (shown <= 0) return null;
  const hours = (time - at.hours) * 5.5;
  const fast = ease(time, at.second - 0.3, at.second + 0.1);
  const count = Math.round(mix(1, 60, ease(time, at.second, at.cheats - 0.3)));
  return (
    <svg
      viewBox="0 0 1080 1920"
      width="1080"
      height="1920"
      role="img"
      aria-label="A clock"
      style={{ position: "absolute", inset: 0, opacity: shown }}
    >
      <g transform="translate(540 1560)">
        <circle r={mix(104, 70, fast)} fill="#10141fd9" stroke="#ffffff" strokeWidth="7" />
        <g opacity={1 - fast}>
          <line y2="-72" stroke="#ffffff" strokeWidth="7" strokeLinecap="round" transform={`rotate(${hours * 360})`} />
          <line y2="-46" stroke="#ffffff" strokeWidth="9" strokeLinecap="round" transform={`rotate(${hours * 30})`} />
        </g>
        <text y="22" textAnchor="middle" fontFamily={MONO} fontWeight="700" fontSize="62" fill={GOLD} opacity={fast}>
          {count}
        </text>
      </g>
    </svg>
  );
}

export const manifest = { assets: {} };

export default function Video() {
  return (
    <Composition fps={30} width={1080} height={1920} background={{ mode: "color", color: INK }}>
      <Track id="stage" layout="free">
        <Three
          id="room"
          start={0}
          duration={LENGTH}
          background={INK}
          camera={{ position: [-7.5, 6.5, 19], lookAt: [0.2, 1.7, 0], fov: 30 }}
          setup={({ scene, camera, renderer, THREE }) => {
            renderer.shadowMap.enabled = true;
            renderer.shadowMap.type = THREE.PCFSoftShadowMap;

            // The room, seen from inside its open corner: a floor, a back wall, a red wall on the right, a ball,
            // and a lamp hanging on the left. Cut it along its width and you get the slice.
            const paint = (colour: string) => new THREE.MeshStandardMaterial({ color: colour, roughness: 0.92 });
            const slab = (size: [number, number, number], where: [number, number, number], colour: string) => {
              const mesh = new THREE.Mesh(new THREE.BoxGeometry(...size), paint(colour));
              mesh.position.set(...where);
              mesh.receiveShadow = true;
              scene.add(mesh);
              return mesh;
            };
            slab([7, 0.3, 7], [0, -0.15, 0], CREAM);
            slab([7, 5.2, 0.3], [0, 2.45, -3.5], "#cfc8ba");
            slab([0.3, 5.2, 7], [3.5, 2.45, 0], RED);
            const ball = new THREE.Mesh(new THREE.SphereGeometry(0.7, 64, 48), paint("#e4ddcf"));
            ball.position.set(0.5, 0.7, 0.4);
            ball.castShadow = true;
            scene.add(ball);

            const lampAt = new THREE.Vector3(-1.9, 3.6, 0.6);
            const cord = new THREE.Mesh(
              new THREE.CylinderGeometry(0.014, 0.014, 1.5, 8),
              new THREE.MeshBasicMaterial({ color: "#3d4356" }),
            );
            cord.position.set(lampAt.x, lampAt.y + 0.9, lampAt.z);
            const bulb = new THREE.Mesh(
              new THREE.SphereGeometry(0.16, 32, 24),
              new THREE.MeshBasicMaterial({ color: "#fff6dc" }),
            );
            bulb.position.copy(lampAt);
            scene.add(cord, bulb);

            // The lights, one for each part of the answer. `paintOnly` is the room with no lighting at all.
            const paintOnly = new THREE.AmbientLight("#ffffff", 0);
            const lamp = new THREE.PointLight("#fff0d2", 0, 0, 1.6);
            lamp.position.copy(lampAt);
            lamp.castShadow = true;
            lamp.shadow.mapSize.set(1024, 1024);
            lamp.shadow.bias = -0.002;
            lamp.shadow.radius = 5;
            const bounce = new THREE.PointLight("#ff6a4a", 0, 9, 1.4);
            bounce.position.set(2.7, 1.3, 0.4);
            const fill = new THREE.HemisphereLight("#cdd6ff", "#3a2a22", 0);
            scene.add(paintOnly, lamp, bounce, fill);

            // "Billions of rays": lines that leave the lamp and bounce from surface to surface.
            let seed = 11;
            const rand = () => {
              seed = (seed * 16807) % 2147483647;
              return seed / 2147483647;
            };
            const onSurface = (): [number, number, number] => {
              const pick = rand();
              if (pick < 0.4) return [rand() * 6.4 - 3.2, 0.02, rand() * 6.4 - 3.2];
              if (pick < 0.7) return [rand() * 6.4 - 3.2, rand() * 3.8, -3.3];
              if (pick < 0.92) return [3.3, rand() * 3.8, rand() * 6.4 - 3.2];
              const a = rand() * 6.28;
              const b = rand() * 1.4;
              return [
                0.5 + 0.72 * Math.cos(a) * Math.sin(b),
                0.7 + 0.72 * Math.cos(b),
                0.4 + 0.72 * Math.sin(a) * Math.sin(b),
              ];
            };
            const RAYS = 90;
            const BOUNCES = 4;
            const path = new Float32Array(RAYS * BOUNCES * 6);
            for (let r = 0; r < RAYS; r++) {
              let from: [number, number, number] = [lampAt.x, lampAt.y, lampAt.z];
              for (let b = 0; b < BOUNCES; b++) {
                const to = onSurface();
                path.set([...from, ...to], (b * RAYS + r) * 6);
                from = to;
              }
            }
            const tangle = new THREE.BufferGeometry();
            tangle.setAttribute("position", new THREE.BufferAttribute(path, 3));
            const rays = new THREE.LineSegments(
              tangle,
              new THREE.LineBasicMaterial({
                color: GOLD,
                transparent: true,
                opacity: 0.32,
                blending: THREE.AdditiveBlending,
                depthWrite: false,
              }),
            );
            scene.add(rays);

            const eye = new THREE.Vector3();
            const aim = new THREE.Vector3();
            return ({ time }) => {
              // Which room this is. Until "cheats": everything on. After it: paint only. In the cut at the end of the
              // first trick: the lamp's direct light and nothing else, so there is no shadow yet.
              const cheated = ease(time, at.cheats - 0.05, at.cheats + 0.25);
              const first = time >= at.room - 0.3 ? 1 : 0;
              const full = 1 - cheated;
              paintOnly.intensity = 1.9 * cheated * (1 - first) + 0.08 * first;
              lamp.intensity = 13 * (full + first) * (1 + 0.35 * ease(time, at.light, at.light + 0.25) * full);
              lamp.shadow.intensity = full;
              bounce.intensity = 2.2 * full;
              fill.intensity = 0.3 * full;
              bulb.scale.setScalar(
                1 + 0.45 * ease(time, at.light, at.light + 0.2) * (1 - ease(time, at.light + 0.2, at.light + 0.9)),
              );
              (bulb.material as InstanceType<typeof THREE.MeshBasicMaterial>).color.set(
                full + first > 0.5 ? "#fff6dc" : "#8b8778",
              );

              // The rays arrive bounce by bounce, and all go at once.
              const grown = ease(time, at.billions, at.hours - 0.3);
              tangle.setDrawRange(0, Math.floor(grown * RAYS * BOUNCES) * 2);
              rays.visible = grown > 0 && cheated < 1;
              (rays.material as InstanceType<typeof THREE.LineBasicMaterial>).opacity = 0.32 * (1 - cheated);

              // The camera: a slow push in from the open corner; then round to face the room side-on, which is the
              // view the slice is drawn from; and back to the corner for the cut at the end.
              const push = ease(time, 0, at.cheats);
              const side = ease(time, at.cheats + 0.5, at.dots + 0.1) * (1 - first);
              eye.set(mix(-7.5, -6.2, push), mix(6.5, 5.6, push), mix(19, 16.5, push));
              aim.set(0.2, mix(1.7, 1.5, push), 0);
              if (first) {
                const drift = ease(time, at.room, at.end);
                eye.set(mix(-6.6, -6.0, drift), 5.8, mix(17.4, 16.4, drift));
              }
              eye.lerp(new THREE.Vector3(0, 2.2, 24), side);
              aim.lerp(new THREE.Vector3(0, 2.2, 0), side);
              camera.position.copy(eye);
              camera.lookAt(aim);
            };
          }}
        >
          {/* The glow of the lamp and of the rays is done to the finished picture, as a game does it. */}
          <Effect id="bloom" type="glow" params={{ radius: 30, intensity: 0.9, threshold: 0.9, tint: 0 }}>
            <Keyframe id="bloom-on" param="intensity" at={at.cheats - 0.05} value={0.9} />
            <Keyframe id="bloom-off" param="intensity" at={at.cheats + 0.3} value={0} />
          </Effect>
        </Three>
        <Layer id="clock" start={0} duration={LENGTH}>
          <Clock />
        </Layer>
        <Layer id="slice" start={0} duration={LENGTH}>
          <Slice />
        </Layer>
      </Track>

      <Captions
        id="said"
        animation="word-by-word"
        style={{ position: "top", size: 76, weight: 800, color: "#8b93a8", highlight: "#ffffff" }}
      >
        {lines.map((line, i) => (
          <Caption
            key={line.start}
            id={`said-${i + 1}`}
            start={line.start}
            end={line.end}
            text={line.text}
            words={line.words}
          />
        ))}
      </Captions>
    </Composition>
  );
}
