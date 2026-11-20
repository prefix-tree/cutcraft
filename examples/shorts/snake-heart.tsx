import { z } from "zod";

import {
  Audio,
  Composition,
  fontFamily,
  googleFont,
  grid,
  Layer,
  progress,
  stepAt,
  Track,
  useLayer,
} from "@uberscene/kit";

import { CharacterWall } from "./blocks/character-wall";

// "Snake heart": a game of snake played on a wall of Chinese characters. The snake eats the characters of one
// phrase, over and over, and each one joins its body. Every character of the wall changes on its own, each at its
// own pace, and all of them at once when the snake eats. When the snake has eaten enough it takes a lap of the
// board and curls up into a heart made of the phrase.
//
// Nothing here is filmed or recorded. The game is written out below as data: where the snake starts, every step it
// takes and where each character appears. The layers then only ask "which step is it at this second" and draw
// that.

// Black, grey, white and one red: the wall is grey, the snake is white, and what it wants is red.
const BG = "#000000";
const WALL = "#4a4a4a";
const SNAKE = "#ffffff";
// One face for the wall and the snake, with the characters of Simplified Chinese.
export const noto = googleFont("Noto Sans SC", { weights: [400, 900] });
const FACE = fontFamily(noto, "sans-serif");

export const schema = z.object({
  /** The phrase the snake eats and the heart is made of, one character to a cell. */
  word: z.string().min(1).max(8),
  /** The colour of the letter to eat, and of the heart. */
  heart: z.string(),
});
export const defaults: z.infer<typeof schema> = { word: "我爱你", heart: "#e5383b" };

// The board: eight big square cells across, filling the frame; the top and bottom rows run off its edges, and
// the snake keeps to the thirteen rows that are whole.
const COLS = 8;
const ROWS = 15;
const BOARD = grid({
  columns: COLS,
  rows: ROWS,
  width: 1080,
  height: (1080 / COLS) * ROWS,
  y: (1920 - (1080 / COLS) * ROWS) / 2,
});
const box = ([column, row]: Cell) => BOARD.rect(column, row);

type Cell = readonly [number, number];
const key = ([x, y]: Cell): number => y * COLS + x;

// Where the heart sits: an 8 by 8 patch as wide as the board, with its top-left cell here.
const HEART_AT: Cell = [0, 2];

// The game, written out. It was played once by a small program that sent the snake the shortest way to each
// character without touching its own body, then on a lap under the heart and round the heart's outline. What is
// kept is the result: where the snake starts, every step it takes, and where each character to eat appears.
const START: Cell = [2, 12];
const MOVES = [
  "RRRUUUUUUUUUUULDDDDDDDDDDDDRRRUUUUUUUUULLLDDDDDDLDDDRUUULUUULLUUUURRUURDDDLDDDDDDLUUUUUUULLDDDRDDRRR",
  "DDDRUUUULLLUUUURRRRDLDDRDDDDDDDLLLLLUUUUUUUURRURUULLURRRDDDDLDDDDDDDLLLDRRRRUUUUUUURUULLLLDDDDDLDDDD",
  "RRRRRRULLLLUUUUUUUULLLUUURRRRRRRDDDDDDDDDDDDLLLLLLLURRRRRRULLLLLLURRRUULULULUUURURDRRRURDRDDDLDLDLD",
].join("");
const FOOD: readonly Cell[] = [
  [5, 1], [4, 13], [7, 4], [4, 10], [3, 13], [3, 7], [1, 6], [1, 3], [3, 1], [3, 10], [2, 3], [0, 6], [4, 11],
  [2, 3], [6, 3], [5, 6], [6, 13], [1, 10], [1, 5], [3, 4], [4, 2], [2, 1], [4, 12], [1, 13], [5, 6], [2, 9],
  [7, 13], [5, 12], [0, 1],
]; // biome-ignore format: a list of cells

/** The game step by step: the head's cell, the snake's length, the character on offer and the second of each step. */
const GAME = (() => {
  const STEP = { R: [1, 0], L: [-1, 0], D: [0, 1], U: [0, -1] } as const;
  const path: Cell[] = [START];
  for (const move of MOVES) {
    const [x, y] = path.at(-1) as Cell;
    const [dx, dy] = STEP[move as keyof typeof STEP];
    path.push([x + dx, y + dy]);
  }
  // A character appears when the one before it is eaten, and is eaten when the head reaches it.
  const length: number[] = [1];
  const food: { cell: Cell; from: number; eaten: number }[] = [];
  let from = 0;
  for (let step = 1; step < path.length; step++) {
    const next = FOOD[food.length];
    const ate = next !== undefined && key(next) === key(path[step] as Cell);
    if (ate) {
      food.push({ cell: next, from, eaten: step });
      from = step;
    }
    length.push((length[step - 1] as number) + (ate ? 1 : 0));
  }
  const closed = path.length - 1;
  // It starts at a walking pace and ends fast, like a game that is going well.
  const wander = closed - (length[closed] as number);
  const times: number[] = [0.6];
  for (let i = 1; i < path.length; i++) {
    const speed = 9 + 16 * Math.min(1, i / wander) ** 0.7;
    times.push((times[i - 1] as number) + 1 / speed);
  }
  return { path, length, food, times, closed };
})();
/** How long the heart beats for after the snake has closed it. */
const HOLD = 3.4;
/** The second the head closes the heart. */
const CLOSED_AT = GAME.times[GAME.closed] as number;
const LENGTH = Math.ceil((CLOSED_AT + HOLD) * 30) / 30;

// What the wall is made of: seasons, sky, and the things of a room and a street.
const WALL_SET = "春夏秋冬日月星光年梦声歌诗画书茶酒灯窗桥路城门钟船信纸笔琴棋伞镜糖盐米面";
const LETTER = {
  position: "absolute",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontFamily: FACE,
  fontSize: 122,
  lineHeight: 1,
} as const;
/**
 * The seconds the snake eats: the wall changes all at once on each, and each has a pop (media/sounds.ts). A riser
 * leads into the moment the heart closes, and a chime plays as it does.
 */
const EATS = GAME.food.map((f) => GAME.times[f.eaten] as number);

function Board({ word, heart }: z.infer<typeof schema>) {
  const clock = useLayer();
  const { elapsed } = clock;
  const { path, length, food } = GAME;

  const step = Math.max(0, stepAt(GAME.times, elapsed));
  const chars = [...word];
  const size = length[step] as number;
  const body = path.slice(Math.max(0, step - size + 1), step + 1);
  const next = food.find((f) => f.from <= step && step < f.eaten);
  const done = elapsed - CLOSED_AT;
  const won = done >= 0;

  // Two beats of the heart once it is closed, then it rests a little larger than life.
  const beat = won ? 0.07 * Math.max(0, Math.sin(done * Math.PI * 2.2)) ** 6 : 0;
  const centre = box([HEART_AT[0] + 4, HEART_AT[1] + 4]);
  const pulse = 0.5 + 0.5 * Math.sin(elapsed * Math.PI * 4);

  return (
    <div style={{ position: "absolute", left: 0, top: 0, width: 1080, height: 1920 }}>
      {next && (
        <div
          data-name="letter"
          style={{
            ...LETTER,
            ...box(next.cell),
            background: BG,
            color: heart,
            fontWeight: 900,
            fontSize: 124,
          }}
        >
          <span style={{ display: "block", transform: `scale(${1 + 0.12 * pulse})` }}>
            {chars[size % chars.length]}
          </span>
        </div>
      )}

      <div
        data-name={won ? "heart" : "snake"}
        style={{
          position: "absolute",
          inset: 0,
          transform: `scale(${1 + beat})`,
          transformOrigin: `${centre.left}px ${centre.top}px`,
        }}
      >
        {body.map((cell, j) => {
          // The heart turns its colour character by character, from the tail round to the head.
          const turned = progress(clock, { after: CLOSED_AT + j * 0.012, over: 0.25, easing: "ease-out" });
          return (
            <div
              key={key(cell)}
              style={{
                ...LETTER,
                ...box(cell),
                background: BG,
                fontSize: 126,
                fontWeight: 900,
                color: turned > 0.5 ? heart : SNAKE,
                textShadow: turned > 0.5 ? `0 0 ${34 * turned}px ${heart}` : "none",
              }}
            >
              {chars[j % chars.length]}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function Video(props: z.infer<typeof schema>) {
  return (
    <Composition fps={30} width={1080} height={1920} background={{ type: "color", color: BG }}>
      <Track id="wall" layout="free">
        {/* The wall of characters the game is played on. It changes each time the snake eats, and fades back at the
            heart. */}
        <Layer id="letters" start={0} duration={LENGTH} ground>
          <CharacterWall
            chars={WALL_SET}
            columns={COLS}
            rows={ROWS}
            color={WALL}
            background={BG}
            font={FACE}
            scale={122 / 135}
            changeAt={EATS}
            dim={{ after: CLOSED_AT, over: 0.6, to: 0.45 }}
          />
        </Layer>
      </Track>
      <Track id="game" layout="free">
        <Layer id="board" start={0} duration={LENGTH}>
          <Board {...props} />
        </Layer>
      </Track>
      <Track id="sounds" role="effects" layout="free">
        {EATS.map((time, i) => (
          <Audio key={time} id={`eat-${i + 1}`} src="asset:pop" start={time} volume={0.55} />
        ))}
        <Audio id="build" src="asset:riser" start={CLOSED_AT - 2} volume={0.4} />
        <Audio id="closed" src="asset:chime" start={CLOSED_AT} volume={0.7} />
      </Track>
    </Composition>
  );
}
