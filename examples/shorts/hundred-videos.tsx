// "Make a hundred videos": 44 seconds of MrBeast on the Lex Fridman Podcast (#351), cut as a vertical short whose
// layout follows what is being said. Full screen for the set-up, the question and the conclusion; while he explains, the shot
// eases back and up and a graphic sits under his face. The crop switches directly where the source's own camera cuts, and
// moves smoothly only when the layout changes. See media/CREDITS.md for the footage.

import { z } from "zod";

import {
  Audio,
  Captions,
  Clip,
  Composition,
  fontFamily,
  googleFont,
  Layer,
  Track,
  useLayer,
  useProgress,
} from "@uberscene/kit";

import { HundredCells } from "./blocks/hundred-cells";
import { PointList } from "./blocks/point-list";

export const schema = z.object({
  /** The one colour that is not navy or white. */
  accent: z.string(),
});
export const defaults: z.infer<typeof schema> = { accent: "#ffd23f" };

const NAVY = "#0b1530";

// The short's own type: a heavy geometric sans, chosen from `uberscene fonts --for headline --category sans --sheet`
// set in its own words. The other shorts use Space Grotesk and Inter.
const poppins = googleFont("Poppins", { weights: [800] });

// The source is 1920x1080 and cuts between two cameras, at these seconds of the excerpt.
const TO_LEX = 341 / 30;
const TO_BEAST = 471 / 30;
const END = 44;
// The recording peaks at full scale; a little under it, so nothing clips once it is encoded again.
const VOICE = 0.9;

// A framing is the part of the source that is shown and where it sits. The part is fitted to the frame's width, so
// a 9:16 part fills the frame and a wider one makes a panel; `y` is the height of its middle, from the frame's top.
interface Framing {
  readonly crop: { readonly x: number; readonly y: number; readonly width: number; readonly height: number };
  readonly y: number;
}
// MrBeast sits right of centre. Full screen: a 9:16 column round him, the full height of the source.
const BEAST_FULL: Framing = { crop: { x: 0.52, y: 0, width: 0.316, height: 1 }, y: 960 };
// Explain: the same shot wider (831 px of the source, shown 1.3 times) and pinned to the top of the frame, so the
// face sits in the upper part of what a phone leaves clear and there is room under it for a graphic. The footage
// is then 1404 px tall; the scrim below hides where it ends.
const EXPLAIN_HEIGHT = 1404;
const BEAST_EXPLAIN: Framing = {
  crop: { x: 0.471, y: 0, width: 0.433, height: 1 },
  y: EXPLAIN_HEIGHT / 2,
};
// Lex sits left of centre: a 9:16 column round him.
const LEX_FULL: Framing = { crop: { x: 0.206, y: 0, width: 0.316, height: 1 }, y: 960 };

/** Where a framing puts the clip: its middle at the framing's height, centred across. */
const placed = (f: Framing) => ({ y: f.y, origin: "center" }) as const;
const framed = (f: Framing) => ({ crop: f.crop });

/** How long a move between the two layouts takes. */
const MOVE = 0.5;

/** Keys from `a` to `b` over a clip's first half second. */
const move = (a: number, b: number) => [
  { at: 0, value: a, easing: "ease-in-out" as const },
  { at: MOVE, value: b },
];

/** A clip moving from one framing to another as it starts: the layout changes, not the shot. */
const reframedBox = (from: Framing, to: Framing) => ({ y: move(from.y, to.y), origin: "center" }) as const;
const reframedCrop = (from: Framing, to: Framing) => ({
  crop: {
    x: move(from.crop.x, to.crop.x),
    y: move(from.crop.y, to.crop.y),
    width: move(from.crop.width, to.crop.width),
    height: move(from.crop.height, to.crop.height),
  },
});

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

// The five things he lists, each with the video he names it for and the excerpt second he says so.
const POINTS = [
  { key: "script", label: "SCRIPT", video: 2, at: 15.6 },
  { key: "edit", label: "EDITING", video: 3, at: 18.82 },
  { key: "voice", label: "VOICE", video: 4, at: 20.9 },
  { key: "thumbnail", label: "THUMBNAIL", video: 5, at: 24.54 },
  { key: "title", label: "TITLE", video: 6, at: 28.1 },
] as const;
/** The five as the point list draws them: the drawing for each, and the second of the short it arrives. */
const ICON = { script: "lines", edit: "cuts", voice: "wave", thumbnail: "frame", title: "type" } as const;
const POINT_LIST = POINTS.map((p) => ({
  name: p.key,
  label: p.label,
  tag: `#${p.video}`,
  icon: ICON[p.key],
  at: T(p.at),
}));

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
    <div
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
        <Clip
          id="us"
          src="asset:hundred-videos"
          volume={VOICE}
          in="word:1"
          out="word:20.end"
          box={placed(BEAST_FULL)}
          transform={framed(BEAST_FULL)}
        />
        {/* "just make a hundred videos, improve something each time, and then talk to me on your hundred-first video" */}
        <Clip
          id="hundred"
          src="asset:hundred-videos"
          volume={VOICE}
          in="word:21"
          out={TO_LEX}
          box={reframedBox(BEAST_FULL, BEAST_EXPLAIN)}
          transform={reframedCrop(BEAST_FULL, BEAST_EXPLAIN)}
        />
        {/* Lex: "the improve something each time is the tricky one. How do you improve something each time?" */}
        <Clip
          id="how"
          src="asset:hundred-videos"
          volume={VOICE}
          in={TO_LEX}
          out={TO_BEAST}
          box={placed(LEX_FULL)}
          transform={framed(LEX_FULL)}
        />
        {/* "the second one, put more effort into the script. The third one … the sixth one, a new title" */}
        <Clip
          id="list"
          src="asset:hundred-videos"
          volume={VOICE}
          in={TO_BEAST}
          out="word:122.end"
          box={placed(BEAST_EXPLAIN)}
          transform={framed(BEAST_EXPLAIN)}
        />
        {/* "there's infinite ways … every little thing can be improved, and they can never not be improved" */}
        <Clip
          id="infinite"
          src="asset:hundred-videos"
          volume={VOICE}
          in="word:123"
          out="word:172.end"
          box={placed(BEAST_EXPLAIN)}
          transform={framed(BEAST_EXPLAIN)}
        />
        {/* "there's literally no such thing as a perfect video" */}
        <Clip
          id="perfect"
          src="asset:hundred-videos"
          volume={VOICE}
          in="word:173"
          out={END}
          box={reframedBox(BEAST_EXPLAIN, BEAST_FULL)}
          transform={reframedCrop(BEAST_EXPLAIN, BEAST_FULL)}
        />
      </Track>

      <Track id="scrim" layout="free">
        <Layer id="scrim-hundred" anchor="hundred" duration={{ until: "hundred" }} ground>
          <Scrim fadeIn={MOVE} />
        </Layer>
        <Layer id="scrim-list" anchor="list" duration={{ until: "infinite" }} ground>
          <Scrim />
        </Layer>
        <Layer id="scrim-out" anchor="perfect" duration={MOVE} ground>
          <Scrim fadeOut={MOVE} />
        </Layer>
      </Track>

      <Track id="graphics" layout="free">
        {/* "Make a hundred videos, improve something each time": a hundred cells fill as he says it, each a shade
            nearer the accent than the last, with the count beside them. On "your hundred-first video" one more arrives. */}
        <Layer id="hundred-grid" anchor="hundred" duration={{ until: "hundred" }}>
          <HundredCells
            accent={accent}
            dim={DIM}
            ink={WHITE}
            font={TYPE.fontFamily}
            x={BAND.x}
            y={BAND.y + 30}
            fill={{ at: T(6.86), over: 2 }}
            next={{ at: T(9.96), over: 0.3 }}
          />
        </Layer>
        {/* Each of the five arrives on its word, is bright while it is the one being named, and dims when the next comes. */}
        <Layer id="points" anchor="list" duration={{ until: "list" }}>
          <PointList
            points={POINT_LIST}
            accent={accent}
            ink={WHITE}
            tile="#16234a"
            font={TYPE.fontFamily}
            x={BAND.x}
            y={BAND.y + 20}
          />
        </Layer>
        <Layer id="ways" anchor="infinite" duration={{ until: "infinite" }}>
          <Infinite accent={accent} />
        </Layer>
      </Track>

      {/* Quiet under the voice: a riser as the hundred cells fill, a pop for the hundred-and-first, a tick per point.
          The files are made by media/sounds.ts. */}
      <Track id="sounds" role="effects" layout="free">
        <Audio id="fill" src="asset:riser" start={T(6.86)} volume={0.3} />
        <Audio id="next" src="asset:pop" start={T(9.96)} volume={0.5} />
        {POINTS.map((point) => (
          <Audio key={point.key} id={`point-${point.key}`} src="asset:tick" start={T(point.at)} volume={0.5} />
        ))}
      </Track>

      <Captions
        id="captions"
        src="asset:hundred-videos"
        animation="word-highlight"
        maxChars={18}
        breakAfter={["word:39"]}
        box={{ x: 504, y: 1155, width: 756, origin: "center" }}
        style={{ font: poppins, size: 60, weight: 800, color: "$text", highlight: "$accent" }}
      />
    </Composition>
  );
}
