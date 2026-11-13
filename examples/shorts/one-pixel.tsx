import { Caption, Captions, Composition, Effect, Keyframe, Layer, Three, Track, useLayer } from "@cutcraft/kit";

// "One pixel": how a game lights a room, told by following one dot of the screen. A narrator's words lead; the
// subtitles show a phrase at a time with a box on the word being said, and each thing on screen arrives on the
// word that names it.
//
// There is no voice in this file. The words are timed at a speaking pace, so a voice can be recorded over the film;
// if it runs differently, its transcript replaces the times worked out below and the picture follows.
//
// Two stages. The room: a small 3D room, which is what the game shows. The slice: the same room cut in half and
// seen from the side, where each trick is explained; its floor is a row of dots, each with its brightness.
//

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
In a video game, light goes straight [through] this ball. No [shadow].
Nothing in a game blocks light, unless the game is told to [fake] it. (0.4)
[Real] light is a nightmare to copy. Every lamp throws out [billions] of rays.
Each one bounces off the walls, the floor, the ball, again and again, before it reaches your eye.
An animated film can spend [hours] working that out for a single picture.
A game has to do it sixty times every [second]. It can't. So it [cheats]. (0.5)
Your screen is millions of tiny [dots]. All the game really does is pick a colour for each one.
Let's follow [one] dot and watch how it gets its light. (0.4)
Here's the first cheat. Think of standing in the [sun]. Turn your face [towards] it and you feel the warmth.
Turn [away] and you don't. The game asks every surface the same thing: are you [facing] the lamp?
Facing it: [bright]. Turned away: [dark]. (0.8) {room1} (1.8) {back1}
But that's not enough, because the [ball] is in the way, and the floor behind it is still bright.
So the game does something clever. It takes a [photo] from where the lamp is.
Anything the lamp can see in that photo gets light. Anything [hidden] behind something else doesn't.
That's all a shadow is: a place the lamp can't see. (0.6) {room2} (1.8) {back2}
Now the shadow is pure [black], and that looks wrong. In real life light [bounces].
Hold a white sheet of paper next to a red wall and the paper turns a little [pink].
Working that out properly is far too slow. So the game's makers work it out [once], long before you play,
and paint the answer onto the room. (0.6) {room3} (1.8) {back3}
Look where the ball [touches] the floor. Less light gets into tight places,
the way the corners of a room always look a little dimmer. The game doesn't work out why.
It just finds the corners and [darkens] them. (0.6) {room4} (1.2)
Last one. A screen can't actually be [dazzling]. So the brightest dots are [smeared] outwards, just a little,
and your eye reads that as glare. (0.5)
Five small cheats, for every dot, sixty times a [again]. (0.3)
That's the light you've been looking at in every game you've ever played. (1.0) {end}
`;

interface Said {
  readonly text: string;
  readonly start: number;
  readonly end: number;
}
/** Seconds a word takes to say at an explainer's pace, and the breath a comma or a full stop takes after it. */
const say = (word: string): number => 0.09 + 0.04 * word.replace(/[^a-z]/gi, "").length;
const breath = (word: string): number => (/[.?!:]$/.test(word) ? 0.25 : /,$/.test(word) ? 0.11 : 0);
const ms = (t: number): number => Math.round(t * 1000) / 1000;

const cue: Record<string, number> = {};
/** The subtitles: a phrase at a time, so a line can be read as it is said. */
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
      // A line ends with its sentence, or at a comma once it has some length, or when it would run too long.
      const length = open.reduce((n, w) => n + w.text.length + 1, 0);
      if (/[.?!]$/.test(text) || (/,$/.test(text) && length >= 18) || length >= 44) close();
    }
  }
  close();
  // No line of one or two words left over from a long sentence: it takes words back from the line before it.
  lines.forEach((line, i) => {
    const before = lines[i - 1];
    if (!before || /[.?!]$/.test(before.text)) return;
    while (line.words.length < 3 && before.words.length > 4) {
      const word = before.words.pop();
      if (word) line.words.unshift(word);
    }
    for (const each of [before, line]) {
      each.text = each.words.map((w) => w.text).join(" ");
      each.start = each.words[0]?.start ?? each.start;
      each.end = ms((each.words[each.words.length - 1]?.end ?? each.end) + 0.12);
    }
  });
  // A subtitle stays up for a moment after its last word, but never into the next one.
  lines.forEach((line, i) => {
    const next = lines[i + 1];
    if (next && line.end > next.start) line.end = next.start;
  });
}
type Cue =
  | "through"
  | "shadow"
  | "fake"
  | "Real"
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
  | "room1"
  | "back1"
  | "ball"
  | "photo"
  | "hidden"
  | "room2"
  | "back2"
  | "black"
  | "bounces"
  | "pink"
  | "once"
  | "room3"
  | "back3"
  | "touches"
  | "darkens"
  | "room4"
  | "dazzling"
  | "smeared"
  | "again"
  | "end";
const at = cue as Record<Cue, number>;
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
/** The dots the ball hides from the lamp, and what the bounce off the red wall gives each of them back. */
const HIDDEN: Readonly<Record<number, number>> = { 5: 8, 6: 11, 7: 14 };
/** What darkening the tight places takes away: where the ball meets the floor, and at the foot of the wall. */
const TIGHT: Readonly<Record<number, number>> = { 5: 3, 6: 2, 9: 4 };

/** The lamp's lines of sight to the floor: where each one ends, and whether the ball stopped it on the way. */
const SIGHT = Array.from({ length: 17 }, (_, k) => {
  const x = 170 + 46 * k;
  const dx = x - LAMP.x;
  const dy = FLOOR - LAMP.y;
  const length = Math.hypot(dx, dy);
  const ux = dx / length;
  const uy = dy / length;
  const along = (BALL.x - LAMP.x) * ux + (BALL.y - LAMP.y) * uy;
  const off = (BALL.x - LAMP.x) ** 2 + (BALL.y - LAMP.y) ** 2 - along ** 2;
  if (off >= BALL.r ** 2) return { x, y: FLOOR, blocked: false };
  const reach = along - Math.sqrt(BALL.r ** 2 - off);
  return { x: LAMP.x + ux * reach, y: LAMP.y + uy * reach, blocked: true };
});
/** The part of the room the lamp cannot see: from the ball's edges down to the floor. */
const WEDGE = "566,1028 672,1066 768,1180 547,1180";
const WALL_HIT = { x: 932, y: 880 };

/** When the slice is on screen: for each trick's explanation, stepping aside for the room after each one. */
const sliceShown = (time: number): number =>
  (
    [
      [at.dots - 0.5, at.room1],
      [at.back1, at.room2],
      [at.back2, at.room3],
      [at.back3, at.room4],
    ] as const
  ).reduce((most, [from, to]) => Math.max(most, ease(time, from, from + 0.35) * (1 - ease(time, to - 0.3, to))), 0);

function Slice() {
  const { time } = useLayer();
  const here = sliceShown(time);
  if (here <= 0) return null;
  const glow = { filter: "drop-shadow(0 0 10px #ffc857) drop-shadow(0 0 3px #ffc857)" };
  const lampOn = ease(time, at.sun - 0.1, at.sun + 0.5);
  const framed = ease(time, at.one, at.one + 0.35);
  const ours = dotX(OURS) + 36;

  // The first trick: is this surface facing the lamp? Its drawing leaves when the room takes over.
  const one = 1 - ease(time, at.room1 - 0.2, at.room1);
  const counted = ease(time, at.bright, at.bright + 0.9);
  const dim = ease(time, at.dark, at.dark + 0.6);
  const pinUp = ease(time, at.towards, at.towards + 0.35) * one;
  const rayIn = ease(time, at.towards + 0.2, at.towards + 0.7) * one;
  const wallPin = ease(time, at.away, at.away + 0.35) * one;
  const fan = ease(time, at.facing, at.facing + 0.8) * one;
  const px = dotX(3) + 36;

  // The second: the ball is in the way. A ray that goes through it, then the lamp's photo, then the shadow.
  const through =
    Math.max(ease(time, at.dark + 0.7, at.dark + 1.3) * one, ease(time, at.ball, at.ball + 0.5)) *
    (1 - ease(time, at.photo - 0.2, at.photo + 0.2));
  const pulse = ease(time, at.ball, at.ball + 0.3) * (1 - ease(time, at.ball + 0.5, at.ball + 1.1));
  const photo = ease(time, at.photo, at.photo + 0.4) * (1 - ease(time, at.room2 - 0.2, at.room2));
  const sweep = ease(time, at.photo + 0.2, at.photo + 1.6);
  const dark = ease(time, at.hidden, at.hidden + 0.7);

  // The third: light bounces off the red wall into the shadow. Worked out once, in advance.
  const flash = ease(time, at.black, at.black + 0.3) * (1 - ease(time, at.black + 0.6, at.black + 1.2));
  const toWall = ease(time, at.bounces, at.bounces + 0.45);
  const fromWall = ease(time, at.bounces + 0.45, at.bounces + 0.95);
  const bounced = toWall * (1 - ease(time, at.room3 - 0.2, at.room3));
  const pink = ease(time, at.pink, at.pink + 0.8);
  const stamp = ease(time, at.once, at.once + 0.25) * (1 - ease(time, at.room3 - 0.4, at.room3 - 0.1));

  // The fourth: tight places are darkened.
  const ring = ease(time, at.touches, at.touches + 0.4);
  const tight = ease(time, at.darkens, at.darkens + 0.7);

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
        <radialGradient id="op-soft">
          <stop offset="0" stopColor="#000000" stopOpacity=".8" />
          <stop offset="1" stopColor="#000000" stopOpacity="0" />
        </radialGradient>
        <pattern id="op-grid" width="60" height="60" patternUnits="userSpaceOnUse">
          <path d="M60 0H0V60" fill="none" stroke="#161b2b" strokeWidth="2" />
        </pattern>
      </defs>
      <rect width="1080" height="1920" fill="url(#op-grid)" opacity=".7" />
      {/* A slow drift, so the diagram is never a still picture. */}
      <g
        transform={`translate(540 ${900 + mix(18, -18, ease(time, at.dots, at.room4))}) scale(1.16) translate(-540 -900)`}
      >
        <line x1="140" y1="520" x2="940" y2="520" stroke="#6f6a60" strokeWidth="8" />
        <line x1="140" y1="516" x2="140" y2={FLOOR + 4} stroke={CREAM} strokeWidth="10" />
        <line x1="940" y1="516" x2="940" y2={FLOOR + 4} stroke={RED} strokeWidth="16" opacity={1 - 0.45 * dim * one} />
        <line x1="135" y1={FLOOR} x2="948" y2={FLOOR} stroke={CREAM} strokeWidth="8" />

        {/* The shadow: the part of the room the lamp cannot see. Black, until the bounce warms it. */}
        <polygon
          points={WEDGE}
          fill={`rgb(${Math.round(58 * pink)},${Math.round(31 * pink)},${Math.round(26 * pink)})`}
          opacity={0.85 * dark}
        />
        <polygon points={WEDGE} fill="none" stroke="#ffffff" strokeWidth="5" opacity={flash} />
        <ellipse cx={BALL.x} cy={FLOOR} rx="130" ry="34" fill="url(#op-soft)" opacity={tight} />
        <ellipse cx="930" cy={FLOOR - 8} rx="64" ry="64" fill="url(#op-soft)" opacity={tight} />

        {/* The lamp's photo: its lines of sight sweep across the room and stop at whatever they meet first. */}
        {SIGHT.map((line, k) => {
          const drawn = ease(sweep, k / 20, k / 20 + 0.2);
          return (
            <g key={line.x} opacity={drawn > 0 ? photo : 0}>
              <line
                x1={LAMP.x}
                y1={LAMP.y}
                x2={mix(LAMP.x, line.x, drawn)}
                y2={mix(LAMP.y, line.y, drawn)}
                stroke={GOLD}
                strokeWidth="3"
                opacity={line.blocked ? 0.95 : 0.45}
              />
              {line.blocked && <circle cx={line.x} cy={line.y} r={7 * ease(drawn, 0.9, 1)} fill={GOLD} />}
            </g>
          );
        })}
        <g transform={`translate(${LAMP.x - 64} ${LAMP.y - 40}) scale(${photo})`} opacity={photo}>
          <rect x="-34" y="-22" width="68" height="46" rx="8" fill="#10141f" stroke="#ffffff" strokeWidth="4" />
          <circle r="12" fill="none" stroke="#ffffff" strokeWidth="4" />
        </g>

        {/* The lamp. */}
        <line x1={LAMP.x} y1="520" x2={LAMP.x} y2={LAMP.y - 26} stroke="#555c70" strokeWidth="5" />
        <circle cx={LAMP.x} cy={LAMP.y} r={130} fill="url(#op-halo)" opacity={lampOn} />
        <circle cx={LAMP.x} cy={LAMP.y} r="26" fill={lampOn > 0.5 ? "#fff6dc" : "#8b8778"} />

        {/* "Are you facing the lamp?", asked of every dot at once. */}
        {FACING.map((_, i) => (
          <line
            key={i}
            x1={LAMP.x}
            y1={LAMP.y}
            x2={mix(LAMP.x, dotX(i) + 36, fan)}
            y2={mix(LAMP.y, FLOOR, fan)}
            stroke={GOLD}
            strokeWidth="3"
            opacity={fan > 0 && i !== 3 && i !== OURS ? 0.4 * fan : 0}
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
          opacity={rayIn > 0 ? one : 0}
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
          opacity={wallPin > 0 ? 0.55 * one : 0}
        />
        <text
          x="870"
          y="820"
          textAnchor="middle"
          fontFamily={MONO}
          fontWeight="700"
          fontSize="40"
          fill="#ffffff"
          opacity={dim * one}
        >
          31
        </text>
        {/* What is wrong with that answer: the lamp's ray goes straight through the ball to our dot. */}
        <line
          x1={LAMP.x}
          y1={LAMP.y}
          x2={ours}
          y2={FLOOR}
          stroke={GOLD}
          strokeWidth="5"
          strokeDasharray="12 12"
          opacity={through}
          style={glow}
        />

        {/* The bounce: out from the lamp, off the red wall, and into the shadow, red now. */}
        <line
          x1={LAMP.x}
          y1={LAMP.y}
          x2={mix(LAMP.x, WALL_HIT.x, toWall)}
          y2={mix(LAMP.y, WALL_HIT.y, toWall)}
          stroke={GOLD}
          strokeWidth="6"
          strokeLinecap="round"
          opacity={bounced}
          style={glow}
        />
        <line
          x1={WALL_HIT.x}
          y1={WALL_HIT.y}
          x2={mix(WALL_HIT.x, ours, fromWall)}
          y2={mix(WALL_HIT.y, FLOOR, fromWall)}
          stroke="#ff7a5c"
          strokeWidth="6"
          strokeLinecap="round"
          opacity={fromWall > 0 ? bounced : 0}
          style={{ filter: "drop-shadow(0 0 10px #ff7a5c)" }}
        />
        <circle cx={WALL_HIT.x} cy={WALL_HIT.y} r={12 * ease(toWall, 0.9, 1)} fill="#ff7a5c" opacity={bounced} />

        <circle cx={BALL.x} cy={BALL.y} r={BALL.r} fill={CREAM} />
        <circle cx={BALL.x} cy={BALL.y} r={BALL.r} fill="url(#op-ball)" opacity={counted} />
        <circle
          cx={BALL.x}
          cy={BALL.y}
          r={BALL.r + 10 + 14 * pulse}
          fill="none"
          stroke="#ffffff"
          strokeWidth="5"
          opacity={pulse}
        />
        {/* The tight places, pointed out before they are darkened. */}
        <circle
          cx={BALL.x}
          cy={FLOOR}
          r="150"
          fill="none"
          stroke="#ffffff"
          strokeWidth="5"
          strokeDasharray="14 12"
          opacity={ring * (1 - 0.6 * tight)}
        />
        <circle
          cx="925"
          cy={FLOOR - 5}
          r="70"
          fill="none"
          stroke="#ffffff"
          strokeWidth="5"
          strokeDasharray="14 12"
          opacity={ring * (1 - 0.6 * tight)}
        />

        {/* The floor, as the screen has it: a row of dots, each with a number for how bright it is. */}
        {FACING.map((facing, i) => {
          const lit = mix(50, facing, ease(time, at.bright + i * 0.05, at.bright + 0.7 + i * 0.05));
          // Our dot goes dark first, then the others the lamp cannot see.
          const hid = i in HIDDEN ? ease(time, at.hidden + (OURS - i) * 0.18, at.hidden + 0.5 + (OURS - i) * 0.18) : 0;
          const back = i in HIDDEN ? (HIDDEN[i] ?? 0) * ease(time, at.pink + (OURS - i) * 0.12, at.pink + 0.7) : 0;
          const taken = (TIGHT[i] ?? 0) * tight;
          const value = Math.round(lit * (1 - hid) + back - taken);
          const grey = Math.round(40 + value * 2.1);
          const warm = i in HIDDEN ? pink : 0;
          const shown = ease(time, at.dots + i * 0.04, at.dots + 0.4 + i * 0.04);
          const changing = (hid > 0 && hid < 1) || (i in HIDDEN && pink > 0 && pink < 1) || (taken > 0 && tight < 1);
          return (
            <g key={i} opacity={shown}>
              <rect
                x={dotX(i)}
                y="1200"
                width="72"
                height="64"
                rx="8"
                fill={`rgb(${Math.round(grey + 44 * warm)},${grey},${Math.round(grey - 10 * warm)})`}
              />
              <text
                x={dotX(i) + 36}
                y="1314"
                textAnchor="middle"
                fontFamily={MONO}
                fontWeight="700"
                fontSize="32"
                fill={i === OURS || (i === 3 && one > 0) || changing ? "#ffffff" : "#9aa2b8"}
              >
                {value}
              </text>
            </g>
          );
        })}
        <g opacity={framed} transform={`translate(${ours} 1232) scale(${mix(1.8, 1, framed)})`}>
          <rect x="-43" y="-39" width="86" height="78" rx="12" fill="none" stroke="#ffffff" strokeWidth="5" />
        </g>
        <text
          x={ours}
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

        {/* "Worked out once, long before you play." */}
        <g transform={`translate(360 1480) rotate(-6) scale(${mix(1.5, 1, stamp)})`} opacity={stamp}>
          <rect x="-230" y="-40" width="460" height="80" rx="10" fill="none" stroke={GOLD} strokeWidth="5" />
          <text y="13" textAnchor="middle" fontFamily={MONO} fontWeight="700" fontSize="36" fill={GOLD}>
            DONE IN ADVANCE
          </text>
        </g>
      </g>
    </svg>
  );
}

/** "For every dot, sixty times a second": for a moment the room is all numbers. */
function Numbers() {
  const { time } = useLayer();
  const shown = ease(time, at.again - 0.1, at.again + 0.3) * (1 - ease(time, at.again + 1.0, at.again + 1.8));
  if (shown <= 0) return null;
  const cells: { x: number; y: number; value: number }[] = [];
  let seed = 5;
  for (let row = 0; row < 12; row++)
    for (let col = 0; col < 9; col++) {
      seed = (seed * 16807) % 2147483647;
      // The numbers tick over, the way they would sixty times a second.
      const value = Math.floor(((seed / 2147483647) * 100 + Math.floor(time * 12) * (7 + ((row * 9 + col) % 5))) % 100);
      cells.push({ x: 110 + col * 107, y: 520 + row * 78, value });
    }
  return (
    <svg
      viewBox="0 0 1080 1920"
      width="1080"
      height="1920"
      role="img"
      aria-label="Every dot's brightness"
      style={{ position: "absolute", inset: 0, opacity: shown * 0.85 }}
    >
      {cells.map((cell) => (
        <text
          key={`${cell.x}-${cell.y}`}
          x={cell.x}
          y={cell.y}
          textAnchor="middle"
          fontFamily={MONO}
          fontWeight="700"
          fontSize="30"
          fill="#ffffff"
          stroke={INK}
          strokeWidth="6"
          paintOrder="stroke"
        >
          {cell.value}
        </text>
      ))}
    </svg>
  );
}

// ---- The opening -------------------------------------------------------------------------------------------------
// The film starts in the slice with everything already going: the lamp on, its rays falling on every dot, the
// numbers bright. The ball rolls in under the lamp and the light goes straight through it.
const NAMES = [
  { text: "LAMP", from: 0.15, x: 470, y: 600, to: [LAMP.x + 30, LAMP.y - 8] },
  { text: "LIGHT", from: 0.45, x: 330, y: 1010, to: [262, 930] },
  { text: "DOTS", from: 0.75, x: 250, y: 1420, to: [dotX(1) + 36, 1330] },
] as const;

function Intro() {
  const { time: now } = useLayer();
  // It is on screen until real light is explained, and comes back for the last moment so the film loops.
  const again = ease(now, at.end - 0.7, at.end - 0.2);
  const here = Math.max(1 - ease(now, at.Real - 0.35, at.Real), again);
  if (here <= 0) return null;
  const time = again > 0 ? 0 : now;
  const glow = { filter: "drop-shadow(0 0 10px #ffc857) drop-shadow(0 0 3px #ffc857)" };
  // The ball rolls in from the right and settles where it will stay for the rest of the film.
  const rolled = ease(time, 0.35, 1.15);
  const ballX = mix(1180, BALL.x, rolled);
  const turn = ((ballX - BALL.x) / BALL.r) * (180 / Math.PI);
  // The rays are seen to pass through it as soon as it arrives, well before the word.
  const through = ease(time, 1.0, 1.35);
  const missing = ease(time, at.shadow, at.shadow + 0.3) * (1 - ease(time, at.fake - 0.1, at.fake + 0.1));
  const faked = ease(time, at.fake, at.fake + 0.35);
  return (
    <svg
      viewBox="0 0 1080 1920"
      width="1080"
      height="1920"
      role="img"
      aria-label="Light from the lamp going straight through the ball"
      style={{ position: "absolute", inset: 0, opacity: here, background: INK }}
    >
      <defs>
        <radialGradient id="in-ball" cx="34%" cy="30%" r="80%">
          <stop offset="0" stopColor="#fffaf0" />
          <stop offset=".55" stopColor="#cfc7b8" />
          <stop offset="1" stopColor="#5d584f" />
        </radialGradient>
        <radialGradient id="in-halo">
          <stop offset="0" stopColor="#fff1c9" stopOpacity=".95" />
          <stop offset=".35" stopColor={GOLD} stopOpacity=".3" />
          <stop offset="1" stopColor={GOLD} stopOpacity="0" />
        </radialGradient>
        <pattern id="in-grid" width="60" height="60" patternUnits="userSpaceOnUse">
          <path d="M60 0H0V60" fill="none" stroke="#161b2b" strokeWidth="2" />
        </pattern>
      </defs>
      <rect width="1080" height="1920" fill="url(#in-grid)" opacity=".7" />
      <g transform={`translate(540 ${900 + mix(26, 18, ease(time, 0, at.Real))}) scale(1.16) translate(-540 -900)`}>
        <line x1="140" y1="520" x2="940" y2="520" stroke="#6f6a60" strokeWidth="8" />
        <line x1="140" y1="516" x2="140" y2={FLOOR + 4} stroke={CREAM} strokeWidth="10" />
        <line x1="940" y1="516" x2="940" y2={FLOOR + 4} stroke={RED} strokeWidth="16" />
        <line x1="135" y1={FLOOR} x2="948" y2={FLOOR} stroke={CREAM} strokeWidth="8" />

        {/* Where a shadow ought to be, and is not; then the fake one the game puts there. */}
        <polygon points={WEDGE} fill="#000000" opacity={0.85 * faked} />
        <polygon
          points={WEDGE}
          fill="none"
          stroke="#ffffff"
          strokeWidth="4"
          strokeDasharray="12 10"
          opacity={missing}
        />

        <line x1={LAMP.x} y1="520" x2={LAMP.x} y2={LAMP.y - 26} stroke="#555c70" strokeWidth="5" />
        <circle cx={LAMP.x} cy={LAMP.y} r={130 + 8 * Math.sin(time * 6)} fill="url(#in-halo)" />

        {/* The light: a ray to every dot, each with a pulse running down it, so the picture is alive from the
            first frame. The three that meet the ball go straight on through it. */}
        {FACING.map((_, i) => {
          const blocked = i in HIDDEN;
          const end = [dotX(i) + 36, FLOOR] as const;
          const run = (time * 1.3 + i * 0.37) % 1;
          return (
            <g key={i} opacity={blocked ? 1 - faked : 1}>
              <line
                x1={LAMP.x}
                y1={LAMP.y}
                x2={end[0]}
                y2={end[1]}
                stroke={GOLD}
                strokeWidth={blocked ? mix(3, 6, through) : 3}
                opacity={blocked ? mix(0.5, 1, through) : 0.5}
                style={blocked && through > 0 ? glow : undefined}
              />
              <circle cx={mix(LAMP.x, end[0], run)} cy={mix(LAMP.y, end[1], run)} r="6" fill="#fff3c4" style={glow} />
            </g>
          );
        })}
        <circle cx={LAMP.x} cy={LAMP.y} r="26" fill="#fff6dc" />

        <g transform={`translate(${ballX} ${BALL.y}) rotate(${turn})`} opacity={0.94}>
          <circle r={BALL.r} fill="url(#in-ball)" />
          <circle cx={BALL.r * 0.45} cy={-BALL.r * 0.35} r="9" fill="#8d877b" />
        </g>
        {/* The rays again, over the ball, so they are seen to pass through it. */}
        {[5, 6, 7].map((i) => (
          <line
            key={i}
            x1={LAMP.x}
            y1={LAMP.y}
            x2={dotX(i) + 36}
            y2={FLOOR}
            stroke={GOLD}
            strokeWidth="5"
            strokeDasharray="14 12"
            strokeDashoffset={-time * 60}
            opacity={through * (1 - faked)}
            style={glow}
          />
        ))}

        {FACING.map((facing, i) => {
          const value = Math.round(i in HIDDEN ? facing * (1 - faked) : facing);
          const grey = Math.round(40 + value * 2.1);
          return (
            <g key={i}>
              <rect x={dotX(i)} y="1200" width="72" height="64" rx="8" fill={`rgb(${grey},${grey},${grey})`} />
              <text
                x={dotX(i) + 36}
                y="1314"
                textAnchor="middle"
                fontFamily={MONO}
                fontWeight="700"
                fontSize="32"
                fill={i in HIDDEN && (missing > 0 || faked > 0) ? "#ffffff" : "#9aa2b8"}
              >
                {value}
              </text>
            </g>
          );
        })}

        {NAMES.map((name) => {
          const shown = ease(time, name.from, name.from + 0.22);
          return (
            <g key={name.text} opacity={shown}>
              <line
                x1={name.x}
                y1={name.y - 12}
                x2={mix(name.x, name.to[0], shown)}
                y2={mix(name.y - 12, name.to[1], shown)}
                stroke="#ffffff"
                strokeWidth="3"
              />
              <text
                x={name.x}
                y={name.y + 24}
                textAnchor="middle"
                fontFamily={SANS}
                fontWeight="800"
                fontSize="32"
                letterSpacing="4"
                fill="#ffffff"
              >
                {name.text}
              </text>
            </g>
          );
        })}
        <text
          x="660"
          y="1420"
          textAnchor="middle"
          fontFamily={SANS}
          fontWeight="800"
          fontSize="32"
          letterSpacing="4"
          fill="#ffffff"
          opacity={missing}
        >
          NO SHADOW
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
          camera={{ position: [-5.0, 4.9, 15.2], lookAt: [-0.15, 1.85, 0.2], fov: 30 }}
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
            // The dark stage the room stands on: a faint grid, the same one the slice is drawn on.
            const ground = new THREE.GridHelper(120, 120, "#1c2236", "#141929");
            ground.position.y = -0.31;
            scene.add(ground);
            const ball = new THREE.Mesh(new THREE.SphereGeometry(0.7, 64, 48), paint("#d2c4a6"));
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
              new THREE.MeshBasicMaterial({ color: "#ffffff" }),
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
            const bounce = new THREE.PointLight("#ff6a4a", 0, 10, 1.2);
            bounce.position.set(1.7, 1.4, 0.8);
            const fill = new THREE.HemisphereLight("#cdd6ff", "#3a2a22", 0);
            scene.add(paintOnly, lamp, bounce, fill);

            // The darkened tight places: soft dark patches laid where the ball meets the floor and along the foot
            // of the walls. Nothing works them out; they are painted there, which is the cheat.
            const soft = (draw: (g: CanvasRenderingContext2D) => void) => {
              const canvas = document.createElement("canvas");
              canvas.width = 256;
              canvas.height = 256;
              const g = canvas.getContext("2d");
              if (g) draw(g);
              return new THREE.MeshBasicMaterial({
                map: new THREE.CanvasTexture(canvas),
                transparent: true,
                depthWrite: false,
                opacity: 0,
              });
            };
            const blob = soft((g) => {
              const fade = g.createRadialGradient(128, 128, 0, 128, 128, 128);
              fade.addColorStop(0, "rgba(0,0,0,0.9)");
              fade.addColorStop(0.45, "rgba(0,0,0,0.5)");
              fade.addColorStop(1, "rgba(0,0,0,0)");
              g.fillStyle = fade;
              g.fillRect(0, 0, 256, 256);
            });
            const edge = soft((g) => {
              const fade = g.createLinearGradient(0, 0, 0, 256);
              fade.addColorStop(0, "rgba(0,0,0,0.75)");
              fade.addColorStop(1, "rgba(0,0,0,0)");
              g.fillStyle = fade;
              g.fillRect(0, 0, 256, 256);
            });
            const laid = (
              material: InstanceType<typeof THREE.MeshBasicMaterial>,
              size: [number, number],
              where: [number, number, number],
              turn: [number, number, number],
            ) => {
              const mesh = new THREE.Mesh(new THREE.PlaneGeometry(...size), material);
              mesh.position.set(...where);
              mesh.rotation.set(...turn);
              scene.add(mesh);
            };
            const flatDown = -Math.PI / 2;
            laid(blob, [2.3, 2.3], [0.5, 0.012, 0.4], [flatDown, 0, 0]);
            laid(edge, [6.7, 1.1], [0, 0.012, -2.8], [flatDown, 0, 0]);
            laid(edge, [6.7, 1.1], [2.8, 0.012, 0], [flatDown, 0, -Math.PI / 2]);
            laid(edge, [6.7, 0.9], [0, 0.45, -3.34], [Math.PI, 0, 0]);
            laid(edge, [6.7, 0.9], [3.34, 0.45, 0], [Math.PI, Math.PI / 2, 0]);

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

            // Where the camera stands for each part of the film: where it is, and what it looks at.
            type Pose = readonly [eye: readonly [number, number, number], aim: readonly [number, number, number]];
            // The room is first seen close, as real light is explained, and pulls back while the rays fill it.
            const CLOSE: Pose = [
              [-5.0, 4.9, 15.2],
              [-0.15, 1.85, 0.2],
            ];
            const OPEN: Pose = [
              [-7.5, 6.5, 19],
              [0.2, 1.7, 0],
            ];
            const SIDE: Pose = [
              [0, 2.2, 24],
              [0, 2.2, 0],
            ];
            const CUTS: readonly [from: Pose, to: Pose][] = [
              [
                [
                  [-6.6, 5.8, 17.4],
                  [0.2, 1.5, 0],
                ],
                [
                  [-6.0, 5.8, 16.4],
                  [0.2, 1.5, 0],
                ],
              ],
              // The shadow: from above, looking down at the floor behind the ball.
              [
                [
                  [-5.2, 8.4, 13.5],
                  [0.9, 0.2, 0.3],
                ],
                [
                  [-4.6, 8.4, 12.6],
                  [0.9, 0.2, 0.3],
                ],
              ],
              // The bounce: turned towards the red wall.
              [
                [
                  [-7.6, 4.6, 14.5],
                  [1.2, 1.2, 0],
                ],
                [
                  [-7.0, 4.6, 13.8],
                  [1.2, 1.2, 0],
                ],
              ],
              // The corners: low and close, where the ball rests on the floor.
              [
                [
                  [-3.4, 2.3, 9.2],
                  [0.6, 0.5, 0.2],
                ],
                [
                  [-3.0, 2.1, 8.4],
                  [0.6, 0.5, 0.2],
                ],
              ],
            ];
            const LAMP_SHOT: Pose = [
              [-3.6, 4.2, 9.5],
              [-1.7, 3.3, 0.6],
            ];
            const eye = new THREE.Vector3();
            const aim = new THREE.Vector3();
            const toEye = new THREE.Vector3();
            const toAim = new THREE.Vector3();
            const stand = (pose: Pose) => {
              eye.set(...pose[0]);
              aim.set(...pose[1]);
            };
            const move = (pose: Pose, k: number) => {
              eye.lerp(toEye.set(...pose[0]), k);
              aim.lerp(toAim.set(...pose[1]), k);
            };
            const cutAt = [at.room1, at.room2, at.room3, at.room4] as const;
            const on = (from: number): number => (time_ >= from - 0.3 ? 1 : 0);
            let time_ = 0;

            return ({ time }) => {
              time_ = time;
              // Which room this is. Until "cheats": everything on. After it: paint only. Then each trick's cut to
              // the room switches that trick on, and it stays on: facing the lamp, the shadow, the bounce, the
              // corners. By the end it is the room from the first frame again.
              const cheated = ease(time, at.cheats - 0.05, at.cheats + 0.25);
              const whole = 1 - cheated;
              const facing = Math.max(whole, on(at.room1));
              const shadow = Math.max(whole, on(at.room2));
              const bounced = Math.max(whole, on(at.room3));
              const corners = Math.max(whole, on(at.room4));
              paintOnly.intensity = 1.9 * cheated * (1 - on(at.room1)) + 0.07 * on(at.room1) * (1 - on(at.room3));
              lamp.intensity = 13 * facing;
              lamp.shadow.intensity = shadow;
              bounce.intensity = 1.5 * bounced;
              fill.intensity = 0.3 * bounced;
              blob.opacity = 0.55 * corners;
              edge.opacity = 0.5 * corners;
              (bulb.material as InstanceType<typeof THREE.MeshBasicMaterial>).color.set(
                facing > 0.5 ? "#ffffff" : "#8b8778",
              );

              // The rays arrive bounce by bounce, and all go at once.
              const grown = ease(time, at.billions, at.hours - 0.3);
              tangle.setDrawRange(0, Math.floor(grown * RAYS * BOUNCES) * 2);
              rays.visible = grown > 0 && cheated < 1;
              (rays.material as InstanceType<typeof THREE.LineBasicMaterial>).opacity = 0.32 * (1 - cheated);

              // The camera. The opening: a slow push in from the open corner, then round to face the room side-on,
              // which is the view the slice is drawn from. After that the slice covers the room between cuts, so
              // each cut has its own place to stand, and drifts while it is up.
              stand(CLOSE);
              move(OPEN, ease(time, at.Real - 0.3, at.billions + 0.6));
              move(
                [
                  [-6.2, 5.6, 16.5],
                  [0.2, 1.5, 0],
                ],
                ease(time, at.billions, at.cheats),
              );
              move(SIDE, ease(time, at.cheats + 0.5, at.dots + 0.1));
              cutAt.forEach((from, k) => {
                const cut = CUTS[k];
                if (!cut || time < from - 0.3) return;
                stand(cut[0]);
                move(cut[1], ease(time, from - 0.3, from + 2.6));
              });
              // The last trick stays in the room: up to the lamp. Then back out to where the film began.
              move(LAMP_SHOT, ease(time, at.room4 + 1.0, at.dazzling));
              move(OPEN, ease(time, at.again - 1.2, at.end - 0.6));
              camera.position.copy(eye);
              camera.lookAt(aim);
            };
          }}
        >
          {/* The glow of the lamp and of the rays is done to the finished picture, as a game does it. */}
          <Effect id="bloom" type="glow" params={{ radius: 64, intensity: 2.2, threshold: 0.84, tint: 0 }}>
            <Keyframe id="bloom-on" param="intensity" at={at.cheats - 0.05} value={2.2} />
            <Keyframe id="bloom-off" param="intensity" at={at.cheats + 0.3} value={0} />
            {/* The last trick: the lamp is a flat disc until its brightness is smeared outwards. */}
            <Keyframe id="bloom-flat" param="intensity" at={at.smeared} value={0} />
            <Keyframe id="bloom-back" param="intensity" at={at.smeared + 0.6} value={2.2} />
          </Effect>
        </Three>
        <Layer id="clock" start={0} duration={LENGTH}>
          <Clock />
        </Layer>
        <Layer id="slice" start={0} duration={LENGTH}>
          <Slice />
        </Layer>
        <Layer id="numbers" start={0} duration={LENGTH}>
          <Numbers />
        </Layer>
        <Layer id="intro" start={0} duration={LENGTH}>
          <Intro />
        </Layer>
      </Track>

      <Captions
        id="said"
        animation="karaoke"
        style={{
          position: "top",
          size: 62,
          weight: 800,
          color: "#ffffff",
          upcoming: "#8b93a8",
          highlight: "#14141c",
          highlightBox: GOLD,
          background: "#0a0c13d0",
        }}
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
