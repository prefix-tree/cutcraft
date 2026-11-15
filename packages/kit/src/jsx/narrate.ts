// A narration: the script of a film that is led by its words, turned into times. Every word gets a start and an
// end, the words are grouped into subtitle lines, and the words the picture listens for become cues by name. The
// times are worked out from a speaking pace, or taken from the transcript of a recorded voice.

/** A word of the narration, with when it is said. */
export interface NarratedWord {
  readonly text: string;
  readonly start: number;
  readonly end: number;
}

/** A subtitle: a phrase of the narration, shown from its first word until a moment after its last. */
export interface NarratedLine {
  readonly text: string;
  readonly start: number;
  readonly end: number;
  /** A plain array, so a line's words go straight into `<Caption words>`. */
  readonly words: NarratedWord[];
}

/** How long things take to say, in seconds. */
export interface NarrationPace {
  /** What every word takes, however short. */
  readonly word: number;
  /** What each letter adds to that. */
  readonly letter: number;
  /** The breath after a comma. */
  readonly comma: number;
  /** The breath after a full stop, a question mark, an exclamation mark or a colon. */
  readonly stop: number;
}

export interface NarrateOptions {
  /** Seconds before the first word. Default 0.3. */
  readonly start?: number;
  /** The speaking pace, for the parts given; the rest keep their defaults (0.09, 0.04, 0.11, 0.25). */
  readonly pace?: Partial<NarrationPace>;
  /** The most characters on a subtitle line. Default 44. */
  readonly lineLength?: number;
  /** Seconds a subtitle stays after its last word, never into the next line. Default 0.12. */
  readonly hold?: number;
  /**
   * The words of a recorded voice with their times (an asset's `transcript` in the manifest). The script's words
   * are matched to them in order, ignoring case and punctuation, and take their times; the pace is not used.
   */
  readonly transcript?: {
    readonly words: readonly { readonly text: string; readonly start: number; readonly end: number }[];
  };
}

export interface Narration {
  /** Every word said, in order. */
  readonly words: readonly NarratedWord[];
  /** The subtitles, a phrase at a time. */
  readonly lines: readonly NarratedLine[];
  /** The cues by name, in seconds. */
  readonly cues: Readonly<Record<string, number>>;
  /** The time of a cue. A name the script does not have is an error, with the names it does have. */
  at(name: string): number;
  /** When the narration is over: the end of the last word, or a pause or a cue after it. */
  readonly duration: number;
  /** What could not be done as asked: a word of the script the transcript does not have. */
  readonly warnings: readonly string[];
}

const DEFAULT_PACE: NarrationPace = { word: 0.09, letter: 0.04, comma: 0.11, stop: 0.25 };
/** A line may end at a comma once it holds this many characters. */
const COMMA_BREAK = 18;

type Token =
  | { readonly kind: "word"; readonly text: string; readonly cue?: string }
  | { readonly kind: "pause"; readonly seconds: number }
  | { readonly kind: "mark"; readonly name: string };

const ms = (t: number): number => Math.round(t * 1000) / 1000;
const letters = (word: string): number => word.replace(/[^a-z]/gi, "").length;
const plain = (word: string): string => word.toLowerCase().replace(/[^\p{L}\p{N}]/gu, "");

function tokens(script: string): Token[] {
  const out: Token[] = [];
  for (const raw of script.split(/\s+/).filter(Boolean)) {
    const pause = /^\(([\d.]+)\)$/.exec(raw);
    const mark = /^\{(\w+)\}$/.exec(raw);
    if (pause) out.push({ kind: "pause", seconds: Number(pause[1]) });
    else if (mark?.[1]) out.push({ kind: "mark", name: mark[1] });
    else {
      const named = /\[(\w+)\]/.exec(raw);
      out.push({ kind: "word", text: raw.replace(/[[\]]/g, ""), ...(named?.[1] ? { cue: named[1] } : {}) });
    }
  }
  return out;
}

/**
 * Times a narration from its script.
 *
 * In the script, a word in `[brackets]` is a cue at the start of that word, named by the word; `(1.5)` is a pause
 * of that many seconds with nothing said; `{name}` is a cue at that moment with no word.
 *
 *   const story = narrate("A game has [no] real light. (0.5) {lamp} So it [cheats].");
 *   story.at("cheats"); // seconds
 *   story.lines;        // the subtitles
 */
export function narrate(script: string, options: NarrateOptions = {}): Narration {
  const pace: NarrationPace = { ...DEFAULT_PACE, ...options.pace };
  const lineLength = options.lineLength ?? 44;
  const hold = options.hold ?? 0.12;
  const first = options.start ?? 0.3;
  const list = tokens(script);
  const warnings: string[] = [];
  const cues: Record<string, number> = {};
  const cue = (name: string, time: number): void => {
    if (name in cues) throw new Error(`the script names the cue "${name}" twice; a cue is one moment`);
    cues[name] = ms(time);
  };

  // When each word is said, in the order of the script, and when the narration ends.
  const said: NarratedWord[] = [];
  let duration: number;
  if (!options.transcript) {
    const say = (word: string): number => pace.word + pace.letter * letters(word);
    const breath = (word: string): number => (/[.?!:]$/.test(word) ? pace.stop : /,$/.test(word) ? pace.comma : 0);
    let t = first;
    for (const token of list) {
      if (token.kind === "pause") t += token.seconds;
      else if (token.kind === "mark") cue(token.name, t);
      else {
        if (token.cue) cue(token.cue, t);
        const end = t + say(token.text);
        said.push({ text: token.text, start: ms(t), end: ms(end) });
        t = end + breath(token.text);
      }
    }
    duration = ms(t);
  } else {
    const timed = fromTranscript(list, options.transcript.words, pace, first, warnings);
    said.push(...timed);
    // Cues: a word's own start, or a moment after the word before it by the pauses written between them.
    let n = 0;
    let waited = 0;
    for (const token of list) {
      if (token.kind === "pause") waited += token.seconds;
      else if (token.kind === "mark") {
        const before = said[n - 1];
        const next = said[n];
        const time = (before ? before.end : 0) + waited;
        cue(token.name, next ? Math.min(time, next.start) : time);
      } else {
        const word = said[n] as NarratedWord;
        if (token.cue) cue(token.cue, word.start);
        n++;
        waited = 0;
      }
    }
    duration = ms(Math.max(0, ...said.map((w) => w.end), ...Object.values(cues)));
  }

  // The subtitles: a line ends with its sentence, at a pause, at a comma once it has some length, or when it would
  // run too long.
  const lines: { text: string; start: number; end: number; words: NarratedWord[] }[] = [];
  let open: NarratedWord[] = [];
  const close = (): void => {
    const head = open[0];
    const tail = open[open.length - 1];
    if (head && tail)
      lines.push({ text: open.map((w) => w.text).join(" "), start: head.start, end: ms(tail.end + hold), words: open });
    open = [];
  };
  let n = 0;
  for (const token of list) {
    if (token.kind === "pause") close();
    else if (token.kind === "word") {
      open.push(said[n++] as NarratedWord);
      const length = open.reduce((sum, w) => sum + w.text.length + 1, 0);
      if (/[.?!]$/.test(token.text) || (/,$/.test(token.text) && length >= COMMA_BREAK) || length >= lineLength)
        close();
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
      each.end = ms((each.words[each.words.length - 1]?.end ?? each.end) + hold);
    }
  });
  // A subtitle stays up for a moment after its last word, but never into the next one.
  lines.forEach((line, i) => {
    const next = lines[i + 1];
    if (next && line.end > next.start) line.end = next.start;
  });

  return {
    words: said,
    lines,
    cues,
    at(name) {
      const time = cues[name];
      if (time === undefined)
        throw new Error(`the script has no cue "${name}"; it has: ${Object.keys(cues).join(", ") || "none"}`);
      return time;
    },
    duration,
    warnings,
  };
}

/**
 * The script's words with a recorded voice's times. Words are matched in order, ignoring case and punctuation (the
 * longest run of matches is kept). A word the voice did not say as written takes a share of the time between the
 * matched words either side of it, by its letters.
 */
function fromTranscript(
  list: readonly Token[],
  heard: readonly { readonly text: string; readonly start: number; readonly end: number }[],
  pace: NarrationPace,
  first: number,
  warnings: string[],
): NarratedWord[] {
  const script = list.flatMap((t) => (t.kind === "word" ? [t.text] : []));
  const a = script.map(plain);
  const b = heard.map((w) => plain(w.text));
  // The longest common run of words, by the usual table: best[i][j] is how many of a[i..] and b[j..] can match.
  const best: Uint32Array[] = Array.from({ length: a.length + 1 }, () => new Uint32Array(b.length + 1));
  for (let i = a.length - 1; i >= 0; i--)
    for (let j = b.length - 1; j >= 0; j--) {
      const row = best[i] as Uint32Array;
      const below = best[i + 1] as Uint32Array;
      row[j] =
        a[i] === b[j] && a[i] !== ""
          ? (below[j + 1] as number) + 1
          : Math.max(below[j] as number, row[j + 1] as number);
    }
  const match: (number | null)[] = a.map(() => null);
  for (let i = 0, j = 0; i < a.length && j < b.length; ) {
    const row = best[i] as Uint32Array;
    const below = best[i + 1] as Uint32Array;
    if (a[i] === b[j] && a[i] !== "") match[i++] = j++;
    else if ((below[j] as number) >= (row[j + 1] as number)) i++;
    else j++;
  }
  const matched = match.filter((m) => m !== null).length;
  if (matched * 2 < script.length)
    throw new Error(
      `the transcript has ${matched} of the script's ${script.length} words: it is not a recording of this script`,
    );

  const say = (word: string): number => pace.word + pace.letter * letters(word);
  const out: (NarratedWord | null)[] = script.map((text, i) => {
    const j = match[i];
    const word = j === null || j === undefined ? null : heard[j];
    return word ? { text, start: ms(word.start), end: ms(word.end) } : null;
  });
  // Each run of words the voice did not say as written, placed between the matched words either side.
  for (let i = 0; i < out.length; i++) {
    if (out[i]) continue;
    let end = i;
    while (end < out.length && !out[end]) end++;
    const run = script.slice(i, end);
    warnings.push(
      `the transcript does not have "${run.join(" ")}" where the script does; ${run.length === 1 ? "it is" : "they are"} timed between the words either side`,
    );
    const before = out[i - 1];
    const after = out[end];
    const needs = run.reduce((sum, w) => sum + say(w), 0);
    // Between two matched words: the gap, shared out. At either end of the script: at the pace, up to the edge.
    const from = before ? before.end : Math.max(0, (after ? after.start : first + needs) - needs);
    const to = after ? after.start : from + needs;
    const span = Math.max(0, to - from);
    let t = from;
    for (let k = i; k < end; k++) {
      const share = needs > 0 ? (say(script[k] as string) / needs) * span : 0;
      out[k] = { text: script[k] as string, start: ms(t), end: ms(t + share) };
      t += share;
    }
    i = end - 1;
  }
  return out as NarratedWord[];
}
