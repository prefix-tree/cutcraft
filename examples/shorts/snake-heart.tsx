import { useMemo } from "react";
import { z } from "zod";

import { Composition, Layer, Track, useLayer } from "@cutcraft/kit";

// "Snake heart": a game of snake played on a wall of letters. The snake eats the letters of one word, over and over,
// and each one becomes a tile of its body. When it has eaten enough it takes a lap of the board and curls up into a
// heart made of the word.
//
// Nothing here is filmed or recorded. The whole game is worked out once, below, from a seed: where each letter
// appears, the way the snake takes to it without running into itself, and how fast it goes. The layer then only
// asks "which step is it at this second" and draws that.

const BG = "#150d1f";
const WALL = "#3b2b4d";
const TILE = "#f6eee2";
const HEAD = "#ffd166";
const INK = "#1b1226";
const MONO = '"JetBrains Mono", monospace';

export const schema = z.object({
  /** The word the snake eats and the heart is made of. */
  word: z.string().min(1).max(8),
  /** The colour of the letter to eat, and of the heart. */
  heart: z.string(),
});
export const defaults: z.infer<typeof schema> = { word: "LOVE", heart: "#ff4d6d" };

// The board: square cells over the whole frame. The game is played in the middle of it, inside the part of a phone
// screen that an app's buttons leave clear.
const CELL = 68;
const COLS = 16;
const ROWS = 28;
const X0 = (1080 - COLS * CELL) / 2;
const Y0 = (1920 - ROWS * CELL) / 2;
const AREA = { left: 1, right: 13, top: 5, bottom: 17 };

type Cell = readonly [number, number];
const key = ([x, y]: Cell): number => y * COLS + x;

// The heart, as the way round its outline one cell at a time, starting at the bottom point and going up the left.
// It is drawn on an 11 by 10 patch and placed on the board at HEART_AT.
const HEART_AT: Cell = [2, 5];
const HEART_PATCH: readonly Cell[] = [
  [5, 9], [4, 9], [4, 8], [3, 8], [3, 7], [2, 7], [2, 6], [1, 6], [1, 5], [0, 5], [0, 4],
  [0, 3], [0, 2], [0, 1], [1, 1], [1, 0], [2, 0], [3, 0], [3, 1], [4, 1], [4, 2], [5, 2],
  [6, 2], [6, 1], [7, 1], [7, 0], [8, 0], [9, 0], [9, 1], [10, 1], [10, 2], [10, 3], [10, 4],
  [10, 5], [9, 5], [9, 6], [8, 6], [8, 7], [7, 7], [7, 8], [6, 8], [6, 9],
]; // biome-ignore format: the outline reads as a list of steps
const HEART: readonly Cell[] = HEART_PATCH.map(([x, y]) => [x + HEART_AT[0], y + HEART_AT[1]] as const);
const HEART_KEYS = new Set(HEART.map(key));
/** The snake is as long as the heart's outline when it curls up. */
const FULL = HEART.length;

// The lap before the heart: down the right side and back and forth along the bottom, ending under the heart's
// point. It is at least as long as the snake, so no part of the body is on the outline when the head starts it.
const LAP: readonly Cell[] = [
  [13, 5], [13, 17], [1, 17], [1, 16], [12, 16], [12, 15], [7, 15],
]; // biome-ignore format: a list of corners

/** A small seeded generator: the same game every time the file is loaded. */
function seeded(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

interface Game {
  /** Every cell the head is on, in order. */
  readonly path: readonly Cell[];
  /** The snake's length at each step. */
  readonly length: readonly number[];
  /** Each letter to eat: where it is, the step it appears at and the step it is eaten at. */
  readonly food: readonly { readonly cell: Cell; readonly from: number; readonly eaten: number }[];
  /** The second each step happens at. */
  readonly times: readonly number[];
  /** The step the head finishes the heart at. */
  readonly closed: number;
}

/**
 * Plays the game. The head goes to each letter by the shortest way that does not touch the body, where a cell the
 * tail will have left by the time the head gets there counts as free.
 */
function play(seed: number): Game {
  const random = seeded(seed);
  const path: Cell[] = [[4, 16]];
  const length: number[] = [1];
  const food: { cell: Cell; from: number; eaten: number }[] = [];
  let size = 1;

  /** The steps from the head to `goal`, or nothing when the body is in the way. */
  const route = (goal: Cell, avoidHeart: boolean): Cell[] | undefined => {
    const head = path.at(-1) as Cell;
    // A cell of the body is free again once the tail has passed it: the j-th cell from the tail, after j + 1 steps.
    const freeAfter = new Map<number, number>();
    const body = path.slice(-size);
    body.forEach((cell, j) => freeAfter.set(key(cell), j + 1));
    const from = new Map<number, Cell | null>([[key(head), null]]);
    let frontier: Cell[] = [head];
    for (let steps = 1; frontier.length > 0 && !from.has(key(goal)); steps++) {
      const next: Cell[] = [];
      for (const [x, y] of frontier) {
        for (const cell of [
          [x + 1, y],
          [x - 1, y],
          [x, y + 1],
          [x, y - 1],
        ] as Cell[]) {
          const k = key(cell);
          if (cell[0] < AREA.left || cell[0] > AREA.right || cell[1] < AREA.top || cell[1] > AREA.bottom) continue;
          if (from.has(k) || (freeAfter.get(k) ?? 0) >= steps) continue;
          if (avoidHeart && HEART_KEYS.has(k)) continue;
          from.set(k, [x, y]);
          next.push(cell);
        }
      }
      frontier = next;
    }
    if (!from.has(key(goal))) return undefined;
    const steps: Cell[] = [];
    for (let at: Cell | null = goal; at && key(at) !== key(head); at = from.get(key(at)) ?? null) steps.unshift(at);
    return steps;
  };
  const walk = (steps: readonly Cell[]): void => {
    for (const cell of steps) {
      path.push(cell);
      length.push(size);
    }
  };

  // The letters, one at a time, until the snake is as long as the heart's outline.
  while (size < FULL) {
    let placed = false;
    for (let tries = 0; tries < 400 && !placed; tries++) {
      const cell: Cell = [
        AREA.left + Math.floor(random() * (AREA.right - AREA.left + 1)),
        AREA.top + Math.floor(random() * (AREA.bottom - AREA.top + 1)),
      ];
      if (path.slice(-size).some((b) => key(b) === key(cell))) continue;
      const steps = route(cell, false);
      // A letter two steps away is no chase; one the body walls off is not offered.
      if (!steps || steps.length < 3) continue;
      const from = path.length - 1;
      walk(steps);
      size++;
      length[length.length - 1] = size;
      food.push({ cell, from, eaten: path.length - 1 });
      placed = true;
    }
    if (!placed) throw new Error("no letter the snake can reach");
  }

  // The lap, then the heart.
  // The way to the lap's first corner may cross the outline; from there on the outline is kept clear.
  for (const [i, corner] of LAP.entries()) {
    const steps = route(corner, i > 0);
    if (!steps) throw new Error("the lap is blocked");
    walk(steps);
  }
  walk(HEART);
  const closed = path.length - 1;

  // It starts at a walking pace and ends fast, like a game that is going well.
  const wander = closed - FULL;
  const times: number[] = [0.6];
  for (let i = 1; i < path.length; i++) {
    const speed = 8 + 24 * Math.min(1, i / wander) ** 0.7;
    times.push((times[i - 1] as number) + 1 / speed);
  }
  return { path, length, food, times, closed };
}

/** The first seed whose game ends well: every letter reached, the lap clear, and no part of the body in the heart's way. */
function firstGame(): Game {
  for (let seed = 47; seed < 500; seed++) {
    try {
      const game = play(seed);
      const lap = game.path.slice(game.closed - 2 * FULL + 1, game.closed - FULL + 1);
      if (lap.every((cell) => !HEART_KEYS.has(key(cell)))) return game;
    } catch {
      // This seed walls the snake in; the next one may not.
    }
  }
  throw new Error("snake-heart: no seed gives a game that ends in the heart");
}

const GAME = firstGame();
/** How long the heart beats for after the snake has closed it. */
const HOLD = 3.4;
const LENGTH = Math.ceil(((GAME.times[GAME.closed] as number) + HOLD) * 30) / 30;

/** The letters of the wall: one for each cell, the same every time. */
const WALL_LETTERS = (() => {
  const random = seeded(99);
  return Array.from({ length: COLS * ROWS }, () => String.fromCharCode(65 + Math.floor(random() * 26)));
})();

const box = (cell: Cell) => ({ left: X0 + cell[0] * CELL, top: Y0 + cell[1] * CELL, width: CELL, height: CELL });
const LETTER = {
  position: "absolute",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontFamily: MONO,
  fontSize: 44,
  lineHeight: 1,
} as const;
const ease = (x: number): number => 1 - (1 - Math.min(1, Math.max(0, x))) ** 3;

/** The wall of letters the game is played on. It fades back when the heart is closed. */
function Wall() {
  const { elapsed } = useLayer();
  const done = elapsed - (GAME.times[GAME.closed] as number);
  const wall = useMemo(
    () =>
      WALL_LETTERS.map((letter, i) => (
        <div key={i} style={{ ...LETTER, ...box([i % COLS, Math.floor(i / COLS)]), color: WALL, fontWeight: 400 }}>
          {letter}
        </div>
      )),
    [],
  );

  return (
    <div
      data-ground
      style={{
        position: "absolute",
        left: 0,
        top: 0,
        width: 1080,
        height: 1920,
        background: BG,
        opacity: done >= 0 ? 1 - 0.55 * ease(done / 0.6) : 1,
      }}
    >
      {wall}
    </div>
  );
}

function Board({ word, heart }: z.infer<typeof schema>) {
  const { elapsed } = useLayer();
  const { path, length, food, times, closed } = GAME;

  // The step the game is at: the last one whose second has come.
  let step = 0;
  for (let lo = 0, hi = path.length - 1; lo <= hi; ) {
    const mid = (lo + hi) >> 1;
    if ((times[mid] as number) <= elapsed) {
      step = mid;
      lo = mid + 1;
    } else hi = mid - 1;
  }
  const size = length[step] as number;
  const body = path.slice(Math.max(0, step - size + 1), step + 1);
  const next = food.find((f) => f.from <= step && step < f.eaten);
  const done = elapsed - (times[closed] as number);
  const won = done >= 0;

  // Two beats of the heart once it is closed, then it rests a little larger than life.
  const beat = won ? 0.07 * Math.max(0, Math.sin(done * Math.PI * 2.2)) ** 6 : 0;
  const centre = { x: X0 + (HEART_AT[0] + 5.5) * CELL, y: Y0 + (HEART_AT[1] + 5) * CELL };
  const pulse = 0.5 + 0.5 * Math.sin(elapsed * Math.PI * 4);

  return (
    <div style={{ position: "absolute", left: 0, top: 0, width: 1080, height: 1920 }}>
      <div
        data-name="score"
        style={{
          position: "absolute",
          left: X0 + 2 * CELL,
          top: Y0 + 4 * CELL,
          width: 11 * CELL,
          height: CELL,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          fontFamily: MONO,
          fontSize: 30,
          fontWeight: 700,
          letterSpacing: 4,
          color: TILE,
          background: BG,
        }}
      >
        <span>SNAKE</span>
        <span style={{ color: won ? heart : TILE }}>{won ? `♥ ${size}` : String(size - 1).padStart(2, "0")}</span>
      </div>

      {next && (
        <div
          data-name="letter"
          style={{
            ...LETTER,
            ...box(next.cell),
            background: BG,
            color: heart,
            fontWeight: 700,
            fontSize: 50,
          }}
        >
          <span style={{ display: "block", transform: `scale(${1 + 0.12 * pulse})` }}>{word[size % word.length]}</span>
        </div>
      )}

      <div
        data-name={won ? "heart" : "snake"}
        style={{
          position: "absolute",
          inset: 0,
          transform: `scale(${1 + beat})`,
          transformOrigin: `${centre.x}px ${centre.y}px`,
        }}
      >
        {body.map((cell, j) => {
          const head = j === body.length - 1;
          // The heart turns its colour tile by tile, from the tail round to the head.
          const turned = won ? ease((done - j * 0.012) / 0.25) : 0;
          return (
            <div key={key(cell)} style={{ position: "absolute", ...box(cell), padding: 4, boxSizing: "border-box" }}>
              <div
                style={{
                  ...LETTER,
                  position: "relative",
                  width: "100%",
                  height: "100%",
                  borderRadius: 12,
                  fontWeight: 700,
                  fontSize: 38,
                  color: INK,
                  background: turned > 0.5 ? heart : head ? HEAD : TILE,
                  boxShadow: turned > 0.5 ? `0 0 ${24 * turned}px ${heart}aa` : "none",
                }}
              >
                {word[j % word.length]}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function Video(props: z.infer<typeof schema>) {
  return (
    <Composition fps={30} width={1080} height={1920} background={{ mode: "color", color: BG }}>
      <Track id="wall" layout="free">
        <Layer id="letters" start={0} duration={LENGTH}>
          <Wall />
        </Layer>
      </Track>
      <Track id="game" layout="free">
        <Layer id="board" start={0} duration={LENGTH}>
          <Board {...props} />
        </Layer>
      </Track>
    </Composition>
  );
}
