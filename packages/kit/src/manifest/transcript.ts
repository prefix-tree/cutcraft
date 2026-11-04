// Transcripts from the files people already have, as the manifest's word list: subtitles (SRT, WebVTT) and the JSON
// that speech-to-text tools write (OpenAI, openai-whisper, faster-whisper, WhisperX, whisper.cpp, ElevenLabs). Pure:
// runs in the browser and in Node.

import type { TranscriptWord } from "./types";

export type TranscriptFormat = "srt" | "vtt" | "json";

export interface ParsedTranscript {
  readonly words: TranscriptWord[];
  /** Some words' times were shared out from a cue or segment rather than measured (`estimated` on those words). */
  readonly estimated: boolean;
}

/** A word before numbering: text and times in seconds. */
interface Raw {
  readonly text: string;
  readonly start: number;
  readonly end: number;
  readonly speaker?: string;
  readonly estimated?: boolean;
}

/**
 * Reads a transcript into the manifest's word list (`assets.<id>.transcript.words`), sniffing the format when it is
 * not given. Subtitle cues time whole lines, so their words share the cue's time by length and are marked `estimated`;
 * JSON with word times keeps them exactly.
 *
 *   const { words } = parseTranscript(await (await fetch("/talk.vtt")).text());
 *   manifest.assets.talk = { ...manifest.assets.talk, transcript: { words } };
 */
export function parseTranscript(text: string, format: TranscriptFormat = sniff(text)): ParsedTranscript {
  const raw = format === "json" ? fromJson(text) : fromCues(text, format);
  const words: TranscriptWord[] = [];
  for (const w of raw) {
    const t = w.text.trim();
    if (!t || !Number.isFinite(w.start) || !Number.isFinite(w.end)) continue;
    const start = ms(Math.max(0, w.start));
    words.push({
      i: words.length,
      text: t,
      start,
      end: Math.max(start, ms(w.end)),
      ...(w.speaker ? { speaker: w.speaker } : {}),
      ...(w.estimated ? { estimated: true } : {}),
    });
  }
  return { words, estimated: words.some((w) => w.estimated) };
}

function sniff(text: string): TranscriptFormat {
  const head = text.replace(/^﻿/, "").trimStart();
  if (head.startsWith("{") || head.startsWith("[")) return "json";
  if (head.startsWith("WEBVTT")) return "vtt";
  if (TIMING.test(text)) return "srt";
  throw new Error("not a transcript: expected SRT, WebVTT or JSON");
}

const ms = (s: number): number => Math.round(s * 1000) / 1000;

// ---- SRT and WebVTT ----

const STAMP = String.raw`(?:(\d+):)?(\d{1,2}):(\d{2})[.,](\d{1,3})`;
const TIMING = new RegExp(`${STAMP}\\s*-->\\s*${STAMP}`);

function seconds(h: string | undefined, m: string, s: string, f: string): number {
  return Number(h ?? 0) * 3600 + Number(m) * 60 + Number(s) + Number(f.padEnd(3, "0")) / 1000;
}

function fromCues(text: string, format: "srt" | "vtt"): Raw[] {
  const out: Raw[] = [];
  const blocks = text
    .replace(/^﻿/, "")
    .replace(/\r\n?/g, "\n")
    .split(/\n{2,}/);
  for (const block of blocks) {
    const lines = block.split("\n");
    const at = lines.findIndex((l) => TIMING.test(l));
    if (at < 0) continue; // the WEBVTT header, NOTE, STYLE and REGION blocks, stray numbers
    const m = TIMING.exec(lines[at] as string) as RegExpExecArray;
    const start = seconds(m[1], m[2] as string, m[3] as string, m[4] as string);
    const end = seconds(m[5], m[6] as string, m[7] as string, m[8] as string);
    const body = lines
      .slice(at + 1)
      .map((l) => l.replace(/^-\s+/, ""))
      .join(" ");
    out.push(...(format === "vtt" ? vttCue(body, start, end) : shareOut(clean(body), start, end, undefined)));
  }
  return out;
}

/** Text without markup: tags (`<i>`, `<c.x>`, `<v Ann>`), SSA overrides (`{\an8}`) and the common entities. */
function clean(text: string): string {
  return text
    .replace(/<[^>]*>/g, "")
    .replace(/\{\\[^}]*\}/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&");
}

/** A cue's words, each given a share of [start, end] by its length: an estimate, marked as one. */
function shareOut(text: string, start: number, end: number, speaker: string | undefined, estimated = true): Raw[] {
  const words = text.split(/\s+/).filter(Boolean);
  if (words.length === 0) return [];
  const total = words.reduce((n, w) => n + w.length, 0);
  const out: Raw[] = [];
  let at = start;
  for (const w of words) {
    const next = at + ((end - start) * w.length) / total;
    out.push({ text: w, start: at, end: next, ...(speaker ? { speaker } : {}), ...(estimated ? { estimated } : {}) });
    at = next;
  }
  return out;
}

const INLINE = new RegExp(`<${STAMP}>`, "g");

/**
 * A WebVTT cue: `<v Ann>` names the speaker; inline timestamps (`<00:01.500>`), where a captioner wrote them, start
 * the words after them. A stretch between two timestamps that holds one word is measured, not estimated.
 */
function vttCue(body: string, start: number, end: number): Raw[] {
  const speaker = /<v(?:\.[^\s>]*)?\s+([^>]+)>/.exec(body)?.[1]?.trim();
  const stamps: { at: number; index: number; length: number }[] = [];
  for (const m of body.matchAll(INLINE))
    stamps.push({
      at: seconds(m[1], m[2] as string, m[3] as string, m[4] as string),
      index: m.index,
      length: m[0].length,
    });
  if (stamps.length === 0) return shareOut(clean(body), start, end, speaker);
  const out: Raw[] = [];
  const edges = [{ at: start, index: 0, length: 0 }, ...stamps];
  edges.forEach((edge, n) => {
    const next = edges[n + 1];
    const text = clean(body.slice(edge.index + edge.length, next ? next.index : body.length));
    const words = text.split(/\s+/).filter(Boolean);
    out.push(...shareOut(text, edge.at, next ? next.at : end, speaker, words.length > 1));
  });
  return out;
}

// ---- JSON from speech-to-text tools ----

type Json = Record<string, unknown>;
const isObject = (v: unknown): v is Json => typeof v === "object" && v !== null && !Array.isArray(v);
const num = (v: unknown): number => (typeof v === "number" ? v : Number.NaN);
const str = (v: unknown): string | undefined => (typeof v === "string" ? v : undefined);

const SHAPES =
  "{ words: [{ word | text, start, end }] } (OpenAI, ElevenLabs, CutCraft), { segments: [{ words | text, start, end }] } (openai-whisper, faster-whisper, WhisperX) or { transcription: [{ tokens, offsets }] } (whisper.cpp)";

function fromJson(text: string): Raw[] {
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch (error) {
    throw new Error(`not a transcript: ${error instanceof Error ? error.message : String(error)}`);
  }
  if (Array.isArray(data)) data = { segments: data };
  if (!isObject(data)) throw new Error(`not a transcript: expected ${SHAPES}`);
  if (Array.isArray(data.words)) return words(data.words);
  if (Array.isArray(data.segments)) return data.segments.filter(isObject).flatMap(segment);
  if (Array.isArray(data.transcription)) return data.transcription.filter(isObject).flatMap(whisperCpp);
  throw new Error(`not a transcript: expected ${SHAPES}`);
}

/** Word objects in seconds: `word` (OpenAI, whisper) or `text` (ElevenLabs, CutCraft); ElevenLabs' spacing dropped. */
function words(list: readonly unknown[], segmentSpeaker?: string): Raw[] {
  const out: Raw[] = [];
  for (const w of list) {
    if (!isObject(w)) continue;
    if (typeof w.type === "string" && w.type !== "word") continue;
    const speaker = str(w.speaker) ?? str(w.speaker_id) ?? segmentSpeaker;
    out.push({
      text: str(w.word) ?? str(w.text) ?? "",
      start: num(w.start),
      end: num(w.end),
      ...(speaker ? { speaker } : {}),
      ...(w.estimated === true ? { estimated: true } : {}),
    });
  }
  return out;
}

/** A segment: its words when it has word times, else its text shared out over its span. */
function segment(s: Json): Raw[] {
  const speaker = str(s.speaker);
  if (Array.isArray(s.words) && s.words.length > 0) return words(s.words, speaker);
  return shareOut(str(s.text) ?? "", num(s.start), num(s.end), speaker);
}

/** whisper.cpp's `-ojf` segment: sub-word tokens with offsets in ms, joined into words on a leading space. */
function whisperCpp(s: Json): Raw[] {
  const offsets = isObject(s.offsets) ? s.offsets : {};
  const tokens = Array.isArray(s.tokens) ? s.tokens.filter(isObject) : [];
  if (tokens.length === 0)
    return shareOut(str(s.text) ?? "", num(offsets.from) / 1000, num(offsets.to) / 1000, undefined);
  const out: { text: string; start: number; end: number }[] = [];
  for (const t of tokens) {
    const text = str(t.text) ?? "";
    if (/^\s*\[_[^\]]*\]\s*$/.test(text) || /^\s*<\|[^|]*\|>\s*$/.test(text)) continue; // [_BEG_], [_TT_123], <|en|>
    const o = isObject(t.offsets) ? t.offsets : {};
    const from = num(o.from) / 1000;
    const to = num(o.to) / 1000;
    const last = out[out.length - 1];
    if (!last || /^\s/.test(text)) out.push({ text: text.trim(), start: from, end: to });
    else {
      last.text += text;
      last.end = to;
    }
  }
  return out;
}
