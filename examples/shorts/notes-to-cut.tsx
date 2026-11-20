// "From notes to a cut": a short product explainer built from blocks. A person asks for a one minute video, the
// reply plans it, a terminal builds and renders it, a ranking checks which scenes hold people, and a closing line says
// what is left: a file. Every scene is a block that ships with the CLI, copied into blocks/ and placed with
// `uberscene blocks add <name> --into notes-to-cut.tsx --track scenes --at <seconds>`; each placement's props say what
// this video needs, and its start is then pinned to the narration's cues.

import { Audio, Caption, Captions, Composition, Layer, narrate, Track } from "@uberscene/kit";

import { ChatReveal } from "./blocks/chat-reveal";
import { QuoteBuild } from "./blocks/quote-build";
import { RankedList } from "./blocks/ranked-list";
import { TerminalTyping } from "./blocks/terminal-typing";

// ---- The narration ---------------------------------------------------------------------------------------------
// There is no voice yet: the words are timed at a speaking pace and shown as subtitles. {name} marks a moment by name.
const SCRIPT = `
Forty pages of notes, one launch on Friday, and no one to edit. (0.4)
{ask} So you ask for a one minute video. (2.6)
{plan} The plan comes back in seconds: three lines, a demo, a title for each. (1.4)
{build} Then the cut is written as a file, and rendered. (3.4)
{check} Before you watch it, it checks which scenes hold people longest, and moves the best one to the front. (2.4)
{close} What you get back is not a black box. (0.3) {file} It is a file you can read, change, and render again. (2.2) {end}
`;

const story = narrate(SCRIPT);
/** The time of a cue, in seconds. A name the script does not have stops the file from loading. */
const at = story.at;
const LENGTH = Math.ceil(story.duration * 10) / 10;
/** Each scene starts a moment before its cue, so the picture is there as the words for it begin. */
const LEAD = 0.3;
const scene = (cue: string): number => at(cue) - LEAD;
/** The last sentence is not a subtitle: the closing quote shows it, from when it is said, at the speed it is said. */
const SAID = story.lines.filter((line) => line.start < at("file"));
const LAST = story.lines.filter((line) => line.start >= at("file"));
const LAST_WORDS = LAST.flatMap((line) => line.words);
const LAST_PACE = LAST_WORDS.length / ((LAST.at(-1)?.end ?? LENGTH) - at("file"));

/** The sound, made by media/sounds.ts: a swish into every scene, a pop per message, a click per command, a thud per
 * change of place, a riser into the last line and a chime under it. */
const CUES: readonly { id: string; sound: string; at: number; volume: number }[] = [
  ...["ask", "build", "check", "close"].map((cue) => ({
    id: `in-${cue}`,
    sound: "swish",
    at: scene(cue) - 0.1,
    volume: 0.45,
  })),
  { id: "message", sound: "pop", at: scene("ask") + 0.3, volume: 0.55 },
  { id: "reply", sound: "pop", at: at("plan"), volume: 0.45 },
  { id: "command-1", sound: "click", at: scene("build") + 0.4, volume: 0.6 },
  { id: "command-2", sound: "click", at: scene("build") + 2.6, volume: 0.6 },
  { id: "place-1", sound: "thud", at: scene("check") + 1.6, volume: 0.5 },
  { id: "place-2", sound: "thud", at: scene("check") + 3.6, volume: 0.5 },
  { id: "build-up", sound: "riser", at: scene("close") - 2, volume: 0.3 },
  { id: "last", sound: "chime", at: LENGTH - 1.8, volume: 0.5 },
];

export default function Video() {
  return (
    <Composition
      fps={30}
      width={1080}
      height={1920}
      background={{ mode: "color", color: "$background" }}
      theme={{
        extends: "midnight",
        palette: {
          background: "#0c0f1a",
          surface: "#1a2033",
          primary: "#5b7cfa",
          onPrimary: "#ffffff",
          accent: "#ffb547",
          text: "#f3f5fb",
          muted: "#8a93ab",
        },
        radius: 18,
      }}
    >
      <Track id="scenes" layout="free">
        <Layer id="hook" start={0} duration={scene("ask")}>
          <QuoteBuild
            text="Forty pages of notes. One minute of video."
            stress={["Forty", "One"]}
            author=""
            role=""
            start={0.2}
            wordsPerSecond={3.6}
            y={700}
            size={84}
          />
        </Layer>
        <Layer id="ask" start={scene("ask")} duration={scene("build") - scene("ask")}>
          <ChatReveal
            messages={[
              { from: "person", text: "Can you turn these notes into a one minute launch video?", after: LEAD },
              {
                from: "reply",
                text: "Here's the plan: open on the problem, three lines from your notes, the demo at 0:20, and a title on each.",
                after: at("plan") - scene("ask") - 0.8,
              },
            ]}
            thinking={0.8}
            size={44}
          />
        </Layer>
        <Layer id="build" start={scene("build")} duration={scene("check") - scene("build")}>
          <TerminalTyping
            steps={[
              {
                command: "uberscene launch.tsx --check-layout",
                output: ["12 elements   1:00", "layout        clean"],
                after: 0.4,
              },
              {
                command: "uberscene launch.tsx --out launch.mp4",
                output: ["drawing   1800 frames", "done      launch.mp4"],
                after: 2.6,
              },
            ]}
            title="launch"
            size={32}
            height={480}
          />
        </Layer>
        <Layer id="check" start={scene("check")} duration={scene("close") - scene("check")}>
          <RankedList
            title="STILL WATCHING, BY SCENE"
            rows={[
              { label: "Demo", values: [52, 61, 74] },
              { label: "Problem", values: [70, 64, 58] },
              { label: "Lines", values: [44, 49, 47] },
              { label: "Titles", values: [38, 41, 43] },
            ]}
            changes={[1.6, 3.6]}
          />
        </Layer>
        <Layer id="close" start={scene("close")} duration={LENGTH - scene("close")}>
          <QuoteBuild
            text="A file you can read, change and render again."
            stress={["read", "change", "render"]}
            author=""
            role=""
            start={at("file") - scene("close")}
            wordsPerSecond={LAST_PACE}
            y={680}
            size={80}
          />
        </Layer>
      </Track>

      <Track id="sounds" role="effects" layout="free">
        {CUES.map((cue) => (
          <Audio key={cue.id} id={cue.id} src={`asset:${cue.sound}`} start={cue.at} volume={cue.volume} />
        ))}
      </Track>
      <Captions
        id="said"
        animation="karaoke"
        box={{ x: 504, y: 373, width: 756, origin: "center" }}
        style={{ font: "$heading", size: 54, weight: 700, color: "$text", upcoming: "$muted", highlight: "$accent" }}
      >
        {SAID.map((line, i) => (
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
