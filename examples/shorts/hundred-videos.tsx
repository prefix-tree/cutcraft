// "Make a hundred videos": 44 seconds of MrBeast on the Lex Fridman Podcast (#351), cut as a vertical short whose
// layout follows what is being said. Full screen for the set-up, the question and the conclusion; a split, with a
// graphic above the speaker, while he explains. The crop switches directly where the source's own camera cuts, and
// moves smoothly only when the layout changes. See media/CREDITS.md for the footage.

import { z } from "zod";

import { Captions, Clip, Composition, Keyframe, Track } from "@cutcraft/kit";

export const schema = z.object({
  /** The one colour that is not navy or white. */
  accent: z.string(),
});
export const defaults: z.infer<typeof schema> = { accent: "#ffd23f" };

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
// Split: a wider, shorter part of the same picture, which makes a panel 1080 by 740 across the bottom of the frame.
const PANEL = { height: 740, top: 1180 };
const BEAST_PANEL: Framing = {
  crop: { x: 0.333, y: 0, width: 0.657, height: 0.8 },
  y: PANEL.top + PANEL.height / 2 - 960,
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

export default function Video({ accent }: z.infer<typeof schema>) {
  return (
    <Composition
      fps={30}
      width={1080}
      height={1920}
      background={{ mode: "color", color: "$background" }}
      theme={{
        extends: "midnight",
        palette: { background: "#0b1530", surface: "#16234a", accent, primary: accent, text: "#ffffff" },
        radius: 20,
      }}
    >
      <Track id="talk">
        {/* "for the average person like us, who don't have these exceptional personalities and backgrounds in filmmaking" */}
        <Clip id="us" src="asset:hundred-videos" in="word:1" out="word:20.end" transform={framed(BEAST_FULL)} />
        {/* "just make a hundred videos, improve something each time, and then talk to me on your hundred-first video" */}
        <Clip id="hundred" src="asset:hundred-videos" in="word:21" out={TO_LEX} transform={framed(BEAST_PANEL)}>
          <Reframe id="hundred" from={BEAST_FULL} to={BEAST_PANEL} />
        </Clip>
        {/* Lex: "the improve something each time is the tricky one. How do you improve something each time?" */}
        <Clip id="how" src="asset:hundred-videos" in={TO_LEX} out={TO_BEAST} transform={framed(LEX_FULL)} />
        {/* "the second one, put more effort into the script. The third one … the sixth one, a new title" */}
        <Clip id="list" src="asset:hundred-videos" in={TO_BEAST} out="word:122.end" transform={framed(BEAST_PANEL)} />
        {/* "there's infinite ways … every little thing can be improved, and they can never not be improved" */}
        <Clip
          id="infinite"
          src="asset:hundred-videos"
          in="word:123"
          out="word:172.end"
          transform={framed(BEAST_PANEL)}
        />
        {/* "there's literally no such thing as a perfect video" */}
        <Clip id="perfect" src="asset:hundred-videos" in="word:173" out={END} transform={framed(BEAST_FULL)}>
          <Reframe id="perfect" from={BEAST_PANEL} to={BEAST_FULL} />
        </Clip>
      </Track>

      <Captions
        id="captions"
        src="asset:hundred-videos"
        animation="word-highlight"
        maxChars={18}
        breakAfter={["word:39"]}
        y={130}
        width={760}
        style={{ font: "Space Grotesk", size: 64, weight: 700, color: "$text", highlight: "$accent" }}
      />
    </Composition>
  );
}
