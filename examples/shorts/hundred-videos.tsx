// "Make a hundred videos": 44 seconds of MrBeast on the Lex Fridman Podcast (#351), cut as a vertical short whose
// layout follows what is being said. Full screen for the set-up, the question and the conclusion; while he explains, the shot
// eases back and up and a graphic sits under his face. The crop switches directly where the source's own camera cuts, and
// moves smoothly only when the layout changes. See media/CREDITS.md for the footage.

import { z } from "zod";

import { Captions, Clip, Composition, googleFont, Keyframe, Layer, Track, useLayer } from "@cutcraft/kit";

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
