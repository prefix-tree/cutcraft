import { z } from "zod";

import {
  Captions,
  Cells,
  Clip,
  Composition,
  CountUp,
  DrawnLine,
  Layer,
  Shape,
  Track,
  useLayer,
  useProgress,
} from "@uberscene/kit";

// A talking head cut into a short: NASA's Ernie Wright on why there is no lunar eclipse every month, and why the
// Moon turns red when there is one. Five cuts out of an eight minute interview, each made on a word of the
// transcript, with captions and a diagram that moves on the words it is about. No cut and no cue in this file is
// typed as seconds: move or trim a clip and everything drawn over it moves too. The only seconds here are how long
// a move takes.
//
// Footage: NASA's Scientific Visualization Studio, item 14791 (public domain). See media/CREDITS.md.

// What a person may change without touching the edit: the accent colour and the two lines the film opens with.
export const schema = z.object({
  accent: z.string(),
  question: z.string(),
  wrong: z.string(),
});
export const defaults = {
  accent: "#ff8a3d",
  question: "A LUNAR ECLIPSE",
  wrong: "EVERY MONTH?",
};

// Where things go. TikTok, Reels and Shorts cover the top of the frame, its bottom third and a strip down the
// right with their own controls, so everything drawn sits in the area between: the diagram's panel at the top of
// it, the captions lowest. The captions' box puts the middle of their lines under the speaker's chin, never across
// his mouth.
// The speaker goes where the diagram is not: the whole frame, or a box in the bottom half under the panel.
//
// The speaker in the 1080 x 1080 source: a 920 x 580 window on him, scaled to the box's width and centred on it.
const BOX = { x: 540, y: 1505, width: 920, height: 580 };
const AT = { x: BOX.x, y: BOX.y, origin: "center" } as const;
const BOXED = {
  crop: { x: 0.04, y: 0.05, width: 0.92, height: 0.58 },
  scale: BOX.width / 1080,
  borderRadius: 28,
};
// The border round the box is drawn under the footage, a little larger than it, so only its outer edge shows.
const RING = {
  shape: "rectangle",
  box: AT,
  width: BOX.width + 16,
  height: BOX.height + 16,
  cornerRadius: 36,
  fill: { type: "none" },
  stroke: { color: "$accent", width: 16 },
  enter: { type: "fade", duration: 0.25 },
  exit: { type: "fade", duration: 0.2 },
} as const;
// The interview was recorded quietly; each clip is raised to a normal speaking level.
const VOICE = 2.2;

export default function Video({ accent, question, wrong }: z.infer<typeof schema>) {
  return (
    <Composition
      fps={30}
      width={1080}
      height={1920}
      background={{ type: "color", color: "$background" }}
      theme={{ extends: "midnight", palette: { accent, primary: accent } }}
    >
      <Track id="rings" layout="free">
        <Shape id="why-ring" anchor="why" duration={{ until: "why" }} {...RING} />
        <Shape id="miss-ring" anchor="miss" duration={{ until: "miss" }} {...RING} />
        <Shape id="hit-ring" anchor="hit" duration={{ until: "hit" }} {...RING} />
        <Shape id="red-ring" anchor="red" duration={{ until: "red" }} {...RING} />
        <Shape id="sunsets-ring" anchor="sunsets" duration={{ until: "sunsets" }} {...RING} />
      </Track>

      <Track id="talk">
        {/* "Eclipses don't happen every month because the Moon's orbit is tilted by about five degrees" */}
        <Clip id="why" src="asset:eclipse" volume={VOICE} in="word:5" out="word:19.end" box={AT} transform={BOXED} />
        {/* "some months … it's going to pass a little bit above the Earth's shadow, and some months … below" */}
        <Clip id="miss" src="asset:eclipse" volume={VOICE} in="word:22" out="word:49.end" box={AT} transform={BOXED} />
        {/* "but about once every six months it actually passes through the Earth's shadow." */}
        <Clip id="hit" src="asset:eclipse" volume={VOICE} in="word:50" out="word:62.end" box={AT} transform={BOXED} />
        {/* "The best thing about a lunar eclipse is that it's beautiful … shades of orange and red and brown." */}
        <Clip id="red" src="asset:eclipse" volume={VOICE} in="word:128" out="word:152.end" box={AT} transform={BOXED} />
        {/* "It's being hit by all of the sunrises and sunsets projected from the Earth" */}
        <Clip
          id="sunsets"
          src="asset:eclipse"
          volume={VOICE}
          in="word:153"
          out="word:166.end"
          box={AT}
          transform={BOXED}
        />
      </Track>

      {/* The diagram. Each layer starts on a word and draws the whole panel from there on, over the one before. */}
      <Track id="diagram" layout="free">
        <Layer id="question" anchor="why" duration={{ until: "why" }}>
          <Question question={question} wrong={wrong} />
        </Layer>
        {/* "because": the wrong answer is struck, and the Earth, its shadow and the Moon's path take its place. */}
        <Layer id="stage" anchor="why" at="word:10" duration={{ until: "why" }}>
          <Stage question={question} wrong={wrong} />
        </Layer>
        {/* "tilted": the path tips, and the Moon at its far end lifts clear of the shadow. */}
        <Layer id="tilt" anchor="why" at="word:15" duration={{ until: "why" }}>
          <Tilt />
        </Layer>

        <Layer id="path" anchor="miss" duration={{ until: "miss" }}>
          <Still tilt={TILT} degrees={5} />
        </Layer>
        {/* "it's going to pass a little bit above": the Moon runs out along the path and over the shadow. */}
        <Layer id="above" anchor="miss" at="word:28" duration={{ until: "miss" }}>
          <Pass side={1} />
        </Layer>
        {/* "and some months": another month, the path the other way up, and the Moon goes under. */}
        <Layer id="below" anchor="miss" at="word:40" duration={{ until: "miss" }}>
          <Swing />
        </Layer>

        <Layer id="under" anchor="hit" duration={{ until: "hit" }}>
          <Still tilt={-TILT} gap={-1} />
        </Layer>
        {/* "once every six months": the months count, and the path comes level. */}
        <Layer id="months" anchor="hit" at="word:52" duration={{ until: "hit" }}>
          <Months />
        </Layer>
        {/* "passes through": the Moon goes into the shadow. */}
        <Layer id="through" anchor="hit" at="word:58" duration={{ until: "hit" }}>
          <Through />
        </Layer>

        {/* The Moon alone, large, taking each colour as he names it. */}
        <Layer id="moon" anchor="red" duration={{ until: "red" }}>
          <Disc from={MOON} to={MOON} />
        </Layer>
        <Layer id="totality" anchor="red" at="word:143" duration={{ until: "red" }}>
          <Disc from={MOON} to={DIM} />
        </Layer>
        <Layer id="orange" anchor="red" at="word:148" duration={{ until: "red" }}>
          <Disc from={DIM} to={ORANGE} />
        </Layer>
        <Layer id="redder" anchor="red" at="word:150" duration={{ until: "red" }}>
          <Disc from={ORANGE} to={RED} />
        </Layer>
        <Layer id="brown" anchor="red" at="word:152" duration={{ until: "red" }}>
          <Disc from={RED} to={BROWN} />
        </Layer>

        <Layer id="earth" anchor="sunsets" duration={{ until: "sunsets" }}>
          <Sunsets />
        </Layer>
        {/* "sunrises and sunsets": the rim of the Earth lights. */}
        <Layer id="rim" anchor="sunsets" at="word:160" duration={{ until: "sunsets" }}>
          <Sunsets rim />
        </Layer>
        {/* "projected": that light bends into the shadow and reaches the Moon. */}
        <Layer id="rays" anchor="sunsets" at="word:163" duration={{ until: "sunsets" }}>
          <Sunsets rim rays />
        </Layer>
      </Track>

      <Captions
        id="captions"
        src="asset:eclipse"
        animation="wordHighlight"
        maxChars={22}
        box={{ y: 1152, origin: "center" }}
        style={{ size: 60, weight: 800, highlight: "#14141c", highlightBox: "$accent" }}
      />
    </Composition>
  );
}

// ---- The diagram ----------------------------------------------------------------------------------------------
// A side view, not to scale: sunlight comes from the left, the Earth throws a shadow to the right, and the Moon's
// path is a line through the Earth with the full Moon at its far end. The path is tilted five degrees to the
// Earth's own; it is drawn steeper so the tilt can be seen.

// The panel everything is drawn on, inside what all three platforms leave clear.
const PANEL = { x: 195, y: 380, width: 690, height: 520 };
const EARTH = { x: 350, y: 600, r: 76 };
/** How far the full Moon is from the Earth, and its size. */
const FAR = 450;
const MOON_R = 34;
/** The tilt as drawn, in degrees. */
const TILT = 14;
// The Moon's colours: in sunlight, in the shadow, and the three he names.
const MOON = "#dcd9d0";
const DIM = "#5b3a30";
const ORANGE = "#e2793a";
const RED = "#b83a2a";
const BROWN = "#7a4a34";
const HEAD = "var(--us-heading)";

const clamp = (v: number): number => Math.min(1, Math.max(0, v));
/** 0 before `a` seconds, 1 after `b`, eased between. */
const ease = (t: number, a: number, b: number): number => {
  const x = clamp((t - a) / (b - a));
  return x * x * (3 - 2 * x);
};
const mix = (a: number, b: number, k: number): number => a + (b - a) * k;
/** A colour between two hex colours. */
const blend = (from: string, to: string, k: number): string => {
  const part = (hex: string, i: number): number => Number.parseInt(hex.slice(1 + i * 2, 3 + i * 2), 16);
  return `rgb(${[0, 1, 2].map((i) => Math.round(mix(part(from, i), part(to, i), k))).join(",")})`;
};
/** Half the shadow's height at `x`: it narrows away from the Earth. */
const shadowHalf = (x: number): number => mix(EARTH.r - 2, 44, clamp((x - EARTH.x) / 520));
/** Where the Moon is on a path tilted `tilt` degrees, `along` of the way out to the full Moon. */
const moonAt = (tilt: number, along = 1): { x: number; y: number } => {
  const a = (tilt * Math.PI) / 180;
  const d = mix(150, FAR, along);
  return { x: EARTH.x + d * Math.cos(a), y: EARTH.y - d * Math.sin(a) };
};

/** The panel, with whatever a beat draws on it. */
function Panel({ children }: { children: React.ReactNode }) {
  return (
    <svg
      viewBox="0 0 1080 1920"
      width="1080"
      height="1920"
      role="img"
      aria-label="Why there is no lunar eclipse every month"
      style={{ position: "absolute", inset: 0 }}
    >
      <rect {...PANEL} rx="28" fill="var(--us-surface)" />
      {children}
    </svg>
  );
}

interface DiagramProps {
  /** The path's tilt as drawn, in degrees: above 0 lifts the full Moon over the shadow. */
  readonly tilt: number;
  /** How far out along the path the Moon is, 0 to 1. */
  readonly along?: number;
  /** How much the Moon shows, 0 to 1. */
  readonly moon?: number;
  /** The Moon's colour; left out, it is lit, or dim where the shadow covers it. */
  readonly tone?: string;
  /** The angle to write at the Earth, in degrees; left out, no angle is drawn. */
  readonly degrees?: number;
  /** Mark the gap between the Moon and the shadow: 1 above, -1 below. */
  readonly gap?: 1 | -1;
  /** Months counted so far, of six; left out, no count is drawn. */
  readonly months?: number;
  /** A line from the Earth out to the Moon, where it has come from. */
  readonly trail?: boolean;
  readonly opacity?: number;
}

/** The Earth, its shadow, the Moon's path and the Moon. */
function Diagram(p: DiagramProps) {
  const end = moonAt(p.tilt);
  const at = moonAt(p.tilt, p.along ?? 1);
  const covered = Math.abs(at.y - EARTH.y) < shadowHalf(at.x) - MOON_R * 0.4;
  const tone = p.tone ?? (covered ? DIM : MOON);
  const far = EARTH.x + 520;
  const lit = p.months ?? 0;
  return (
    <g opacity={p.opacity ?? 1}>
      {/* Sunlight, from the left. */}
      {[-40, 0, 40].map((dy) => (
        <path
          key={dy}
          d={`M218 ${EARTH.y + dy} h34 m-10 -8 l10 8 l-10 8`}
          fill="none"
          stroke="var(--us-accent)"
          strokeWidth="4"
          strokeLinecap="round"
          strokeLinejoin="round"
          opacity="0.75"
        />
      ))}
      <path
        data-name="shadow"
        d={`M${EARTH.x} ${EARTH.y - shadowHalf(EARTH.x)} L${far} ${EARTH.y - shadowHalf(far)} L${far} ${EARTH.y + shadowHalf(far)} L${EARTH.x} ${EARTH.y + shadowHalf(EARTH.x)} Z`}
        fill="var(--us-background)"
      />
      <text
        x={EARTH.x + 300}
        y={EARTH.y + 40}
        textAnchor="middle"
        fontFamily={HEAD}
        fontWeight="700"
        fontSize="26"
        letterSpacing="3"
        fill="var(--us-muted)"
      >
        SHADOW
      </text>
      {/* The Moon's path. */}
      <line
        x1={EARTH.x}
        y1={EARTH.y}
        x2={end.x}
        y2={end.y}
        stroke="var(--us-muted)"
        strokeWidth="3"
        strokeDasharray="10 9"
      />
      {p.trail ? (
        <line
          x1={moonAt(p.tilt, 0).x}
          y1={moonAt(p.tilt, 0).y}
          x2={at.x}
          y2={at.y}
          stroke={MOON}
          strokeWidth="4"
          strokeLinecap="round"
          opacity="0.55"
        />
      ) : null}
      {p.degrees !== undefined ? (
        <g data-name="angle">
          <line
            x1={EARTH.x}
            y1={EARTH.y}
            x2={EARTH.x + 290}
            y2={EARTH.y}
            stroke="var(--us-accent)"
            strokeWidth="3"
            opacity="0.5"
          />
          <path
            d={`M${EARTH.x + 220} ${EARTH.y} A220 220 0 0 0 ${EARTH.x + 220 * Math.cos((p.tilt * Math.PI) / 180)} ${EARTH.y - 220 * Math.sin((p.tilt * Math.PI) / 180)}`}
            fill="none"
            stroke="var(--us-accent)"
            strokeWidth="5"
            strokeLinecap="round"
          />
          <CountUp
            to={5}
            progress={p.degrees / 5}
            format={(degrees) => `${Math.round(degrees)}°`}
            x={EARTH.x + 150}
            y={EARTH.y + 128}
            fontFamily={HEAD}
            fontWeight="800"
            fontSize="46"
            fill="var(--us-accent)"
          />
        </g>
      ) : null}
      <circle data-name="earth" cx={EARTH.x} cy={EARTH.y} r={EARTH.r} fill="#3d6fd6" />
      <path
        d={`M${EARTH.x} ${EARTH.y - EARTH.r} A${EARTH.r} ${EARTH.r} 0 0 1 ${EARTH.x} ${EARTH.y + EARTH.r} Z`}
        fill="#16264d"
      />
      {p.gap ? (
        <path
          d={`M${end.x} ${EARTH.y - p.gap * (shadowHalf(end.x) + 5)} V${end.y + p.gap * (MOON_R + 5)}`}
          stroke="var(--us-accent)"
          strokeWidth="4"
          strokeDasharray="3 7"
          strokeLinecap="round"
        />
      ) : null}
      <circle data-name="moon" cx={at.x} cy={at.y} r={MOON_R} fill={tone} opacity={p.moon ?? 1} />
      {p.months !== undefined ? (
        <g>
          <Cells
            name="months"
            count={6}
            x={390}
            y={PANEL.y + PANEL.height - 94}
            size={44}
            gap={14}
            radius={9}
            fill="var(--us-background)"
            litFill="var(--us-accent)"
            lit={lit}
          />
          <text
            x="372"
            y={PANEL.y + PANEL.height - 62}
            textAnchor="end"
            fontFamily={HEAD}
            fontWeight="700"
            fontSize="24"
            letterSpacing="3"
            fill="var(--us-muted)"
          >
            MONTHS
          </text>
        </g>
      ) : null}
      <text
        x={PANEL.x + 28}
        y={PANEL.y + PANEL.height - 26}
        fontFamily={HEAD}
        fontWeight="600"
        fontSize="20"
        fill="var(--us-muted)"
        opacity="0.8"
      >
        not to scale
      </text>
    </g>
  );
}

/** The question the film opens on, and the wrong answer. `struck` draws the line through it, 0 to 1. */
function Lines({
  question,
  wrong,
  struck = 0,
  opacity = 1,
}: {
  question: string;
  wrong: string;
  struck?: number;
  opacity?: number;
}) {
  const half = wrong.length * 21;
  return (
    <g data-name="question" opacity={opacity}>
      <text
        x="540"
        y="560"
        textAnchor="middle"
        fontFamily={HEAD}
        fontWeight="700"
        fontSize="50"
        letterSpacing="2"
        fill="var(--us-muted)"
      >
        {question}
      </text>
      <text x="540" y="656" textAnchor="middle" fontFamily={HEAD} fontWeight="800" fontSize="68" fill="var(--us-text)">
        {wrong}
      </text>
      <DrawnLine
        from={[540 - half, 634]}
        to={[540 + half, 634]}
        progress={struck}
        stroke="var(--us-accent)"
        strokeWidth="9"
        strokeLinecap="round"
      />
    </g>
  );
}

function Question({ question, wrong }: { question: string; wrong: string }) {
  return (
    <Panel>
      <Lines question={question} wrong={wrong} />
    </Panel>
  );
}

/** The answer is struck out; then the picture of why takes its place: a level path would put the Moon in the shadow. */
function Stage({ question, wrong }: { question: string; wrong: string }) {
  const struck = useProgress({ over: 0.3 });
  const swap = useProgress({ after: 0.45, over: 0.6 });
  return (
    <Panel>
      <Lines question={question} wrong={wrong} struck={struck} opacity={1 - swap} />
      <Diagram tilt={0} opacity={swap} />
    </Panel>
  );
}

/** The diagram as it stands, nothing moving: what a cut opens on before its first word. */
function Still(p: DiagramProps) {
  return (
    <Panel>
      <Diagram {...p} />
    </Panel>
  );
}

function Tilt() {
  const k = useProgress({ over: 0.9 });
  return (
    <Panel>
      <Diagram tilt={TILT * k} degrees={5 * k} />
    </Panel>
  );
}

/** The Moon runs out along the path to where the full Moon is, and the gap to the shadow is marked. */
function Pass({ side }: { side: 1 | -1 }) {
  const { elapsed } = useLayer();
  const out = useProgress({ over: 1.3 });
  return (
    <Panel>
      <Diagram tilt={side * TILT} along={out} trail={out < 1} {...(elapsed > 1.4 ? { gap: side } : {})} degrees={5} />
    </Panel>
  );
}

/** Another month: the Moon goes, the path swings the other way up, and the Moon comes back under the shadow. */
function Swing() {
  const { elapsed } = useLayer();
  const k = useProgress({ after: 0.15, over: 0.85 });
  // The Moon fades out and back in while the path swings.
  const gone = useProgress({ over: 1.15 });
  return (
    <Panel>
      <Diagram
        tilt={mix(TILT, -TILT, k)}
        moon={Math.abs(1 - 2 * gone)}
        {...(elapsed > 1.3 ? { gap: -1 as const } : {})}
      />
    </Panel>
  );
}

/** Six months are counted while the path comes most of the way level. */
function Months() {
  const { elapsed } = useLayer();
  const k = useProgress({ after: 0.1, over: 1.1 });
  return (
    <Panel>
      <Diagram tilt={mix(-TILT, -TILT * 0.45, k)} months={Math.floor(clamp((elapsed - 0.1) / 1.0) * 6 + 0.001)} />
    </Panel>
  );
}

/** The path is level: the Moon goes into the shadow and loses the sunlight. */
function Through() {
  const k = useProgress({ over: 0.9 });
  return (
    <Panel>
      <Diagram tilt={mix(-TILT * 0.45, 0, k)} months={6} tone={blend(MOON, DIM, ease(k, 0.55, 1))} />
    </Panel>
  );
}

/** The Moon alone, going from one colour to the next. */
function Disc({ from, to }: { from: string; to: string }) {
  const k = useProgress({ over: 0.35 });
  const y = PANEL.y + PANEL.height / 2;
  const r = 170;
  // Its seas, darker patches that keep their place as the colour changes.
  const seas = [
    [-0.32, -0.28, 0.2],
    [0.3, 0.22, 0.13],
    [0.05, -0.5, 0.09],
    [-0.1, 0.42, 0.11],
  ] as const;
  return (
    <Panel>
      <circle data-name="disc" cx="540" cy={y} r={r} fill={blend(from, to, k)} />
      {seas.map(([dx, dy, size]) => (
        <circle key={`${dx}`} cx={540 + r * dx} cy={y + r * dy} r={r * size} fill="#000000" opacity="0.1" />
      ))}
    </Panel>
  );
}

/** Closer on the Earth, the Moon inside its shadow. `rim` lights the edge of the Earth; `rays` carry that light in. */
function Sunsets({ rim = false, rays = false }: { rim?: boolean; rays?: boolean }) {
  // Each layer draws what the one before it ended on, and moves only its own part.
  const lighting = useProgress({ over: 0.6 });
  const reaching = useProgress({ over: 0.8 });
  const lit = rim ? (rays ? 1 : lighting) : 0;
  const reach = rays ? reaching : 0;
  const E = { x: 400, y: 620, r: 128 };
  const M = { x: 760, y: 620, r: 42 };
  const far = 866;
  const half = (x: number): number => mix(E.r - 3, 92, clamp((x - E.x) / 470));
  return (
    <Panel>
      {[-70, 0, 70].map((dy) => (
        <path
          key={dy}
          d={`M218 ${E.y + dy} h30 m-10 -8 l10 8 l-10 8`}
          fill="none"
          stroke="var(--us-accent)"
          strokeWidth="4"
          strokeLinecap="round"
          strokeLinejoin="round"
          opacity="0.75"
        />
      ))}
      <path
        d={`M${E.x} ${E.y - half(E.x)} L${far} ${E.y - half(far)} L${far} ${E.y + half(far)} L${E.x} ${E.y + half(E.x)} Z`}
        fill="var(--us-background)"
      />
      {[-1, 1].map((side) => (
        <path
          key={side}
          d={`M${E.x + 18} ${E.y + side * (E.r + 4)} Q${mix(E.x + 18, 620, reach)} ${E.y + side * mix(E.r + 4, 70, reach)} ${mix(E.x + 18, M.x - M.r, reach)} ${E.y + side * mix(E.r + 4, 16, reach)}`}
          fill="none"
          stroke={ORANGE}
          strokeWidth="7"
          strokeLinecap="round"
          opacity={reach > 0 ? 0.9 : 0}
        />
      ))}
      <circle
        cx={E.x}
        cy={E.y}
        r={E.r + 5}
        fill="none"
        stroke={ORANGE}
        strokeWidth={mix(0, 11, lit)}
        opacity={lit}
        data-name="rim"
      />
      <circle cx={E.x} cy={E.y} r={E.r} fill="#3d6fd6" />
      <path d={`M${E.x} ${E.y - E.r} A${E.r} ${E.r} 0 0 1 ${E.x} ${E.y + E.r} Z`} fill="#16264d" />
      <circle data-name="moon" cx={M.x} cy={M.y} r={M.r} fill={blend(DIM, RED, ease(reach, 0.6, 1))} />
      <text
        data-name="credit"
        x="540"
        y={PANEL.y + PANEL.height - 34}
        textAnchor="middle"
        fontFamily={HEAD}
        fontWeight="600"
        fontSize="26"
        fill="var(--us-muted)"
      >
        Ernie Wright, NASA
      </text>
    </Panel>
  );
}
