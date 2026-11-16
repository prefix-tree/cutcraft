// "Make a hundred videos": 44 seconds of MrBeast on the Lex Fridman Podcast (#351), cut as a vertical short whose
// layout follows what is being said. Full screen for the set-up, the question and the conclusion; while he explains, the shot
// eases back and up and a graphic sits under his face. The crop switches directly where the source's own camera cuts, and
// moves smoothly only when the layout changes. See media/CREDITS.md for the footage.

import { z } from "zod";

import {
  Captions,
  Cells,
  Clip,
  Composition,
  fontFamily,
  googleFont,
  Keyframe,
  Layer,
  Track,
  useLayer,
  useProgress,
} from "@cutcraft/kit";

export const schema = z.object({
  /** The one colour that is not navy or white. */
  accent: z.string(),
});
export const defaults: z.infer<typeof schema> = { accent: "#ffd23f" };

const NAVY = "#0b1530";

// The short's own type: a heavy geometric sans, chosen from `cutcraft fonts --for headline --category sans --sheet`
// set in its own words. The other shorts use Space Grotesk and Inter.
const poppins = googleFont("Poppins", { weights: [800] });

// The source is 1920x1080 and cuts between two cameras, at these seconds of the excerpt.
const TO_LEX = 341 / 30;
const TO_BEAST = 471 / 30;
const END = 44;

// A framing is the part of the source that is shown and where it sits. The part is fitted to the frame's width, so
// a 9:16 part fills the frame and a wider one makes a panel; `y` moves it down from the frame's centre.
interface Framing {
  readonly crop: { readonly x: number; readonly y: number; readonly width: number; readonly height: number };
  readonly y: number;
}
// MrBeast sits right of centre. Full screen: a 9:16 column round him, the full height of the source.
const BEAST_FULL: Framing = { crop: { x: 0.52, y: 0, width: 0.316, height: 1 }, y: 0 };
// Explain: the same shot wider (831 px of the source, shown 1.3 times) and pinned to the top of the frame, so the
// face sits in the upper part of what a phone leaves clear and there is room under it for a graphic. The footage
// is then 1404 px tall; the scrim below hides where it ends.
const EXPLAIN_HEIGHT = 1404;
const BEAST_EXPLAIN: Framing = {
  crop: { x: 0.471, y: 0, width: 0.433, height: 1 },
  y: EXPLAIN_HEIGHT / 2 - 960,
};
// Lex sits left of centre: a 9:16 column round him.
const LEX_FULL: Framing = { crop: { x: 0.206, y: 0, width: 0.316, height: 1 }, y: 0 };

const framed = (f: Framing) => ({ crop: f.crop, position: { x: 0, y: f.y } });

/** How long a move between the two layouts takes. */
const MOVE = 0.5;

/** Keyframes that move a clip from one framing to another over its first half second: the layout changes, not the shot. */
function Reframe({ id, from, to }: { id: string; from: Framing; to: Framing }) {
  const moves = [
    ["x", "transform.crop.x", from.crop.x, to.crop.x],
    ["t", "transform.crop.y", from.crop.y, to.crop.y],
    ["w", "transform.crop.width", from.crop.width, to.crop.width],
    ["h", "transform.crop.height", from.crop.height, to.crop.height],
    ["y", "transform.position.y", from.y, to.y],
  ] as const;
  return (
    <>
      {moves.flatMap(([key, property, a, b]) => [
        <Keyframe key={`${key}0`} id={`${id}-${key}0`} property={property} at={0} value={a} />,
        <Keyframe key={`${key}1`} id={`${id}-${key}1`} property={property} at={MOVE} value={b} easing="ease-in-out" />,
      ])}
    </>
  );
}

// ── The graphics ────────────────────────────────────────────────────────────────────────────────────────────────
// Each is drawn under the face in the Explain framing, inside what TikTok, Reels and Shorts all leave clear:
// x 120 to 888, y 800 to 1080, with the subtitles under it. Times are the excerpt's own seconds (the transcript's),
// turned into seconds of the short by `T`: the short starts 0.44 s into the excerpt.
const T = (excerpt: number) => excerpt - 0.44;
const BAND = { x: 120, y: 810, width: 768, height: 270 };
const WHITE = "#ffffff";
const DIM = "#33416b";
const TYPE = { fontFamily: fontFamily(poppins, "sans-serif"), fontWeight: 800, fill: WHITE } as const;

function Board({ children }: { children: React.ReactNode }) {
  return (
    <svg width={1080} height={1920} style={{ position: "absolute", left: 0, top: 0, color: WHITE }} role="img">
      <title>graphic</title>
      {children}
    </svg>
  );
}

/** A colour between two, for a cell that is a little better than the one before it. */
function mix(a: string, b: string, k: number): string {
  const part = (hex: string, i: number) => Number.parseInt(hex.slice(1 + i * 2, 3 + i * 2), 16);
  const at = (i: number) => Math.round(part(a, i) + (part(b, i) - part(a, i)) * k);
  return `rgb(${at(0)}, ${at(1)}, ${at(2)})`;
}

/**
 * "Make a hundred videos, improve something each time": a hundred cells fill as he says it, each a shade nearer the
 * accent than the last, with the count beside them. On "your hundred-first video" one more arrives.
 */
function Hundred({ accent }: { accent: string }) {
  const COLUMNS = 20;
  const SIZE = 26;
  const GAP = 6;
  const filled = Math.round(100 * useProgress({ at: T(6.86), over: 2, easing: "ease-in-out" }));
  const next = useProgress({ at: T(9.96), over: 0.3 });
  const top = BAND.y + 30;
  const right = BAND.x + COLUMNS * (SIZE + GAP) - GAP;
  return (
    <Board>
      {[0, 1, 2, 3, 4].map((row) => (
        <Cells
          key={row}
          {...(row === 0 ? { name: "grid" } : {})}
          count={COLUMNS}
          x={BAND.x}
          y={top + row * (SIZE + GAP)}
          size={SIZE}
          gap={GAP}
          radius={6}
          fill={(i) => (row * COLUMNS + i < filled ? mix("#8fa0d0", accent, (row * COLUMNS + i) / 99) : DIM)}
        />
      ))}
      {/* The hundred-and-first: the next row's first cell, ringed. */}
      <g data-name="next" opacity={next}>
        <rect x={BAND.x + 8} y={top + 5 * (SIZE + GAP)} width={SIZE} height={SIZE} rx={6} fill={accent} />
        <rect
          x={BAND.x + 3}
          y={top + 5 * (SIZE + GAP) - 5}
          width={SIZE + 10}
          height={SIZE + 10}
          rx={10}
          fill="none"
          stroke={WHITE}
          strokeWidth={3}
        />
      </g>
      <g data-name="count">
        <text {...TYPE} x={right + 64} y={top + 62} fontSize={60} textAnchor="middle" dominantBaseline="central">
          {filled + Math.round(next)}
        </text>
        <text
          {...TYPE}
          x={right + 64}
          y={top + 128}
          fontSize={24}
          fill={accent}
          textAnchor="middle"
          dominantBaseline="central"
        >
          VIDEOS
        </text>
      </g>
    </Board>
  );
}

// The five things he lists, each with the video he names it for and the excerpt second he says so.
const POINTS = [
  { key: "script", label: "SCRIPT", video: 2, at: 15.6 },
  { key: "edit", label: "EDITING", video: 3, at: 18.82 },
  { key: "voice", label: "VOICE", video: 4, at: 20.9 },
  { key: "thumbnail", label: "THUMBNAIL", video: 5, at: 24.54 },
  { key: "title", label: "TITLE", video: 6, at: 28.1 },
] as const;
const TILE = { width: 140, height: 170, gap: 17 };

/** A small drawing of each point, in a box 100 by 80 whose top left is the origin. */
function Icon({ kind, ink, accent }: { kind: (typeof POINTS)[number]["key"]; ink: string; accent: string }) {
  if (kind === "script")
    return (
      <g>
        {[0, 1, 2, 3].map((row) => (
          <rect
            key={row}
            x={0}
            y={row * 22}
            width={[100, 78, 100, 56][row]}
            height={10}
            rx={5}
            fill={row === 1 ? accent : ink}
          />
        ))}
      </g>
    );
  if (kind === "edit")
    return (
      <g>
        <rect x={0} y={18} width={40} height={36} rx={8} fill={ink} />
        <rect x={50} y={18} width={50} height={36} rx={8} fill={ink} />
        <rect x={42} y={4} width={6} height={72} rx={3} fill={accent} />
      </g>
    );
  if (kind === "voice")
    return (
      <g>
        {[26, 54, 78, 40, 66, 30, 48].map((h, i) => (
          <rect key={i} x={i * 15} y={40 - h / 2} width={9} height={h} rx={4.5} fill={i === 2 ? accent : ink} />
        ))}
      </g>
    );
  if (kind === "thumbnail")
    return (
      <g>
        <rect x={0} y={8} width={100} height={62} rx={10} fill="none" stroke={ink} strokeWidth={6} />
        <path d="M 40 24 L 66 39 L 40 54 Z" fill={accent} />
      </g>
    );
  return (
    <g>
      <text {...TYPE} x={0} y={30} fontSize={54} fill={ink} dominantBaseline="central">
        Aa
      </text>
      <rect x={0} y={66} width={100} height={8} rx={4} fill={accent} />
    </g>
  );
}

/** One of the five: it arrives on its word, is bright while it is the one being named, and dims when the next comes. */
function Point({ index, accent }: { index: number; accent: string }) {
  const point = POINTS[index] as (typeof POINTS)[number];
  const later = POINTS[index + 1];
  const here = useProgress({ at: T(point.at), over: 0.3 });
  const passed = useProgress({ at: T(later?.at ?? 1e6), over: 0.3 });
  const x = BAND.x + index * (TILE.width + TILE.gap);
  const y = BAND.y + 20 + (1 - here) * 24 - (here - passed) * 8;
  const ink = mix(WHITE, "#7f8bb3", passed);
  return (
    <g data-name={point.key} opacity={here * (1 - passed * 0.35)} transform={`translate(${x} ${y})`}>
      <rect
        width={TILE.width}
        height={TILE.height}
        rx={20}
        fill="#16234a"
        stroke={accent}
        strokeOpacity={here - passed}
        strokeWidth={4}
      />
      <text {...TYPE} x={16} y={26} fontSize={20} fill={accent} dominantBaseline="central">
        #{point.video}
      </text>
      <g transform="translate(20 62)">
        <Icon kind={point.key} ink={ink} accent={accent} />
      </g>
      <text
        {...TYPE}
        x={TILE.width / 2}
        y={TILE.height + 30}
        fontSize={20}
        fill={ink}
        textAnchor="middle"
        dominantBaseline="central"
      >
        {point.label}
      </text>
    </g>
  );
}

function Points({ accent }: { accent: string }) {
  return (
    <Board>
      {POINTS.map((point, index) => (
        <Point key={point.key} index={index} accent={accent} />
      ))}
    </Board>
  );
}

// "There's infinite ways": what he lists, with the excerpt second of each, laid out as chips in rows.
const WAYS = [
  { label: "COLOR", at: 34.26, row: 0, x: 0 },
  { label: "FRAME RATE", at: 34.98, row: 0, x: 132 },
  { label: "EDITING", at: 35.52, row: 1, x: 0 },
  { label: "FILMING", at: 36.06, row: 1, x: 152 },
  { label: "PRODUCTION", at: 36.58, row: 2, x: 0 },
  { label: "JOKES", at: 37.3, row: 2, x: 204 },
  { label: "PACING", at: 37.82, row: 3, x: 0 },
] as const;
const EVERY = 38.44;

function Way({ index, accent }: { index: number; accent: string }) {
  const way = WAYS[index] as (typeof WAYS)[number];
  const here = useProgress({ at: T(way.at), over: 0.25 });
  // "every little thing can be improved": they all light.
  const all = useProgress({ at: T(EVERY) + index * 0.06, over: 0.3 });
  const width = way.label.length * 15.5 + 34;
  const x = BAND.x + 330 + way.x;
  const y = BAND.y + 18 + way.row * 60 + (1 - here) * 14;
  return (
    <g data-name={way.label.toLowerCase().replace(" ", "-")} opacity={here} transform={`translate(${x} ${y})`}>
      <rect
        width={width}
        height={48}
        rx={24}
        fill={mix("#16234a", accent, all)}
        stroke={mix(DIM, accent, all)}
        strokeWidth={3}
      />
      <text
        {...TYPE}
        x={width / 2}
        y={25}
        fontSize={22}
        fill={mix(WHITE, NAVY, all)}
        textAnchor="middle"
        dominantBaseline="central"
      >
        {way.label}
      </text>
    </g>
  );
}

/** The loop he is describing: make one, look at it, improve one thing, again. A marker goes round it without end. */
function Loop({ accent }: { accent: string }) {
  const { elapsed } = useLayer();
  const drawn = useProgress({ after: 0.1, over: 0.6 });
  // A stadium: two straights and two half circles, traced as one path the marker rides.
  const box = { x: BAND.x + 24, y: BAND.y + 40, width: 270, height: 150 };
  const r = box.height / 2;
  const straight = box.width - 2 * r;
  const length = 2 * straight + 2 * Math.PI * r;
  const path = `M ${box.x + r} ${box.y} h ${straight} a ${r} ${r} 0 0 1 0 ${box.height} h ${-straight} a ${r} ${r} 0 0 1 0 ${-box.height} Z`;
  const along = ((elapsed / 2.4) % 1) * length;
  const where = (d: number): [number, number] => {
    if (d < straight) return [box.x + r + d, box.y];
    if (d < straight + Math.PI * r) {
      const a = (d - straight) / r - Math.PI / 2;
      return [box.x + r + straight + r * Math.cos(a), box.y + r + r * Math.sin(a)];
    }
    if (d < 2 * straight + Math.PI * r)
      return [box.x + r + straight - (d - straight - Math.PI * r), box.y + box.height];
    const a = (d - 2 * straight - Math.PI * r) / r + Math.PI / 2;
    return [box.x + r + r * Math.cos(a), box.y + r + r * Math.sin(a)];
  };
  const [mx, my] = where(along);
  const steps = [
    { label: "MAKE", x: box.x + box.width / 2, y: box.y - 22 },
    { label: "IMPROVE", x: box.x + box.width / 2, y: box.y + box.height + 26 },
  ];
  return (
    <g data-name="loop" opacity={drawn}>
      <path d={path} fill="none" stroke={DIM} strokeWidth={10} />
      <path
        d={path}
        fill="none"
        stroke={accent}
        strokeWidth={10}
        strokeLinecap="round"
        strokeDasharray={`${length * 0.22} ${length}`}
        strokeDashoffset={-((along - length * 0.22 + length) % length)}
      />
      <circle cx={mx} cy={my} r={13} fill={WHITE} />
      <text
        {...TYPE}
        x={box.x + box.width / 2}
        y={box.y + r + 4}
        fontSize={84}
        textAnchor="middle"
        dominantBaseline="central"
      >
        ∞
      </text>
      {steps.map((step) => (
        <text
          key={step.label}
          {...TYPE}
          x={step.x}
          y={step.y}
          fontSize={20}
          fill={accent}
          textAnchor="middle"
          dominantBaseline="central"
        >
          {step.label}
        </text>
      ))}
    </g>
  );
}

function Infinite({ accent }: { accent: string }) {
  return (
    <Board>
      <Loop accent={accent} />
      {WAYS.map((way, index) => (
        <Way key={way.label} index={index} accent={accent} />
      ))}
    </Board>
  );
}

/**
 * The scrim under the face in the Explain framing: clear at his shoulders, solid navy from the chest down, so a
 * graphic and the subtitles sit on dark and the footage's lower edge is never seen. `fadeIn` and `fadeOut` are the
 * seconds it takes to arrive and to leave, for the two moves; a direct cut gives neither.
 */
function Scrim({ fadeIn = 0, fadeOut = 0 }: { fadeIn?: number; fadeOut?: number }) {
  const { elapsed, remaining } = useLayer();
  const shown = Math.min(fadeIn > 0 ? elapsed / fadeIn : 1, fadeOut > 0 ? remaining / fadeOut : 1, 1);
  return (
    // `data-ground`: to the layout check this is a ground that things sit on, not a box that covers them.
    <div
      data-ground
      style={{
        position: "absolute",
        inset: 0,
        opacity: shown,
        background: `linear-gradient(to bottom, ${NAVY}00 700px, ${NAVY}d9 900px, ${NAVY} 1040px)`,
      }}
    />
  );
}

export default function Video({ accent }: z.infer<typeof schema>) {
  return (
    <Composition
      fps={30}
      width={1080}
      height={1920}
      background={{ mode: "color", color: "$background" }}
      theme={{
        extends: "midnight",
        palette: { background: NAVY, surface: "#16234a", accent, primary: accent, text: "#ffffff" },
        radius: 20,
      }}
    >
      <Track id="talk">
        {/* "for the average person like us, who don't have these exceptional personalities and backgrounds in filmmaking" */}
        <Clip id="us" src="asset:hundred-videos" in="word:1" out="word:20.end" transform={framed(BEAST_FULL)} />
        {/* "just make a hundred videos, improve something each time, and then talk to me on your hundred-first video" */}
        <Clip id="hundred" src="asset:hundred-videos" in="word:21" out={TO_LEX} transform={framed(BEAST_EXPLAIN)}>
          <Reframe id="hundred" from={BEAST_FULL} to={BEAST_EXPLAIN} />
        </Clip>
        {/* Lex: "the improve something each time is the tricky one. How do you improve something each time?" */}
        <Clip id="how" src="asset:hundred-videos" in={TO_LEX} out={TO_BEAST} transform={framed(LEX_FULL)} />
        {/* "the second one, put more effort into the script. The third one … the sixth one, a new title" */}
        <Clip id="list" src="asset:hundred-videos" in={TO_BEAST} out="word:122.end" transform={framed(BEAST_EXPLAIN)} />
        {/* "there's infinite ways … every little thing can be improved, and they can never not be improved" */}
        <Clip
          id="infinite"
          src="asset:hundred-videos"
          in="word:123"
          out="word:172.end"
          transform={framed(BEAST_EXPLAIN)}
        />
        {/* "there's literally no such thing as a perfect video" */}
        <Clip id="perfect" src="asset:hundred-videos" in="word:173" out={END} transform={framed(BEAST_FULL)}>
          <Reframe id="perfect" from={BEAST_EXPLAIN} to={BEAST_FULL} />
        </Clip>
      </Track>

      <Track id="scrim" layout="free">
        <Layer id="scrim-hundred" anchor="hundred" duration={{ until: "hundred" }}>
          <Scrim fadeIn={MOVE} />
        </Layer>
        <Layer id="scrim-list" anchor="list" duration={{ until: "infinite" }}>
          <Scrim />
        </Layer>
        <Layer id="scrim-out" anchor="perfect" duration={MOVE}>
          <Scrim fadeOut={MOVE} />
        </Layer>
      </Track>

      <Track id="graphics" layout="free">
        <Layer id="hundred-grid" anchor="hundred" duration={{ until: "hundred" }}>
          <Hundred accent={accent} />
        </Layer>
        <Layer id="points" anchor="list" duration={{ until: "list" }}>
          <Points accent={accent} />
        </Layer>
        <Layer id="ways" anchor="infinite" duration={{ until: "infinite" }}>
          <Infinite accent={accent} />
        </Layer>
      </Track>

      <Captions
        id="captions"
        src="asset:hundred-videos"
        animation="word-highlight"
        maxChars={18}
        breakAfter={["word:39"]}
        x={-36}
        y={195}
        width={756}
        style={{ font: poppins, size: 60, weight: 800, color: "$text", highlight: "$accent" }}
      />
    </Composition>
  );
}
