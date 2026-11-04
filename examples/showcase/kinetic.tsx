import { z } from "zod";

import { Captions, Clip, Composition, Layer, Motion, Track } from "@cutcraft/kit";

export const schema = z.object({ accent: z.string() });
export const defaults = { accent: "#e8a33d" };

const big = {
  position: "absolute",
  left: 0,
  right: 0,
  textAlign: "center",
  color: "#f4efe6",
  font: "700 92px 'Space Grotesk', sans-serif",
  letterSpacing: "-0.03em",
  lineHeight: 1,
} as const;
const word = { display: "inline-block", marginRight: "0.22em" } as const;
/** One sequence step: a selector, its keyframes, its options. */
const slam: [string, Record<string, unknown>, Record<string, unknown>] = [
  ".k",
  { scale: [2.4, 1], opacity: [0, 1] },
  { duration: 0.35, ease: [0.2, 0.9, 0.2, 1] },
];

/**
 * Kinetic type for a vertical short: each phrase slams or stacks in on the word that starts it, over the speaker and
 * karaoke captions. Every layer is anchored to a word, so recutting the talk retimes the type.
 */
export default function Video({ accent }: z.infer<typeof schema>) {
  return (
    <Composition fps={30} width={540} height={960} theme={{ extends: "midnight", palette: { primary: accent } }}>
      <Track id="main" name="Speaker">
        <Clip id="talk" src="asset:speaker" in="word:0" out="word:24.end" fit="cover" />
      </Track>
      <Track id="shade" name="Shade" layout="free">
        <Layer id="dim" start={0} duration={11.1}>
          <div style={{ position: "absolute", inset: 0, background: "rgba(10, 12, 20, 0.45)" }} />
        </Layer>
      </Track>
      <Track id="type" name="Type" layout="free">
        <Motion id="every-cut" anchor="talk" at="word:0" duration={1.5} sequence={[slam]}>
          <div className="k" style={{ ...big, top: 300 }}>
            Every
            <br />
            <span style={{ color: accent }}>cut</span>
          </div>
        </Motion>
        <Motion
          id="line-of-code"
          anchor="talk"
          at="word:4"
          duration={1.5}
          sequence={[
            [".a", { y: [80, 0], opacity: [0, 1] }, { duration: 0.3, ease: "easeOut" }],
            [".b", { y: [80, 0], opacity: [0, 1] }, { at: 0.12, duration: 0.3, ease: "easeOut" }],
            [
              ".c",
              { y: [80, 0], opacity: [0, 1], color: ["#f4efe6", accent] },
              { at: 0.24, duration: 0.3, ease: "easeOut" },
            ],
          ]}
        >
          <div style={{ ...big, top: 320, fontSize: 80 }}>
            <span className="a" style={word}>
              a line
            </span>
            <span className="b" style={word}>
              of
            </span>
            <br />
            <span className="c" style={word}>
              code.
            </span>
          </div>
        </Motion>
        <Motion
          id="move-a-clip"
          anchor="talk"
          at="word:7"
          duration={1.6}
          sequence={[
            [".k", { x: [-540, 0] }, { duration: 0.4, ease: [0.2, 0.9, 0.2, 1] }],
            [".k", { x: [0, 30] }, { at: 0.5, duration: 1, ease: "linear" }],
          ]}
        >
          <div className="k" style={{ ...big, top: 340, fontSize: 84 }}>
            Move a clip
          </div>
        </Motion>
        <Motion
          id="words-move"
          anchor="talk"
          at="word:11"
          duration={1.9}
          sequence={[
            [".a", { opacity: [0, 1], rotate: [-8, 0] }, { duration: 0.3 }],
            [".b", { opacity: [0, 1], rotate: [8, 0] }, { at: 0.15, duration: 0.3 }],
            [".c", { opacity: [0, 1], scale: [0.6, 1] }, { at: 0.3, duration: 0.3 }],
          ]}
        >
          <div style={{ ...big, top: 300, fontSize: 80 }}>
            <span className="a" style={word}>
              the words
            </span>
            <br />
            <span className="b" style={{ ...word, color: accent }}>
              move
            </span>
            <br />
            <span className="c" style={word}>
              with it.
            </span>
          </div>
        </Motion>
        <Motion id="point-lands" anchor="talk" at="word:16" duration={2.1} sequence={[slam]}>
          <div className="k" style={{ ...big, top: 320, fontSize: 84 }}>
            The point
            <br />
            lands
          </div>
        </Motion>
        <Motion
          id="names-it"
          anchor="talk"
          at="word:21"
          duration={1.6}
          sequence={[
            [".k", { opacity: [0, 1], y: [40, 0] }, { duration: 0.3 }],
            [".u", { scaleX: [0, 1] }, { at: 0.25, duration: 0.35, ease: "easeOut" }],
          ]}
        >
          <div className="k" style={{ ...big, top: 330, fontSize: 84 }}>
            on the word.
          </div>
          <div
            className="u"
            style={{
              position: "absolute",
              left: 90,
              right: 90,
              top: 430,
              height: 10,
              background: accent,
              transformOrigin: "left",
            }}
          />
        </Motion>
      </Track>
      <Captions id="captions" src="asset:speaker" style={{ size: 30 }} animation="karaoke" />
    </Composition>
  );
}
