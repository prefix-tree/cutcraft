import { z } from "zod";

import { Badge, Captions, Clip, Composition, Frame, QuoteCard, Track, TypeCard } from "@cutcraft/kit";

// A talking head cut into a short: NASA's Ernie Wright on why there is no lunar eclipse every month, and why the
// Moon turns red when there is one. Five cuts out of an eight minute interview, each made on a word of the
// transcript, with captions and cards that come in on the words they are about. No time in this file is typed as
// seconds: move or trim a clip and everything said over it moves too.
//
// Footage: NASA's Scientific Visualization Studio, item 14791 (public domain). See media/CREDITS.md.

// What a person may change without touching the edit: the accent colour and the two lines the film opens with.
export const schema = z.object({
  accent: z.string(),
  question: z.string(),
  wrong: z.string(),
});
export const defaults = {
  accent: "#ff8a3d",
  question: "A LUNAR ECLIPSE",
  wrong: "EVERY MONTH?",
};

// Where things go. TikTok and Reels cover the top of the frame and its bottom third with their own controls, so
// every word sits in the band between: a card at the top of it, the captions in the middle, a badge under them.
// The speaker goes where words cannot: the whole frame behind them, or a box in the bottom half under a card.
//
// The speaker in the 1080 x 1080 source, three ways. FULL and CLOSE are 9:16 windows on him. BOXED is a 920 x 700
// window, scaled to the box's width and moved to its centre.
const FULL = { crop: { x: 0.2, y: 0, width: 0.5625, height: 1 } };
const CLOSE = { crop: { x: 0.25, y: 0, width: 0.46, height: 0.818 } };
const BOX = { y: 430, width: 920, height: 700 };
const BOXED = {
  crop: { x: 0.04, y: 0.05, width: 0.92, height: 0.7 },
  scale: BOX.width / 1080,
  position: { x: 0, y: BOX.y },
  borderRadius: 28,
};
// The border round the box is drawn under the footage, a little larger than it, so only its outer edge shows.
const RING = { y: BOX.y, width: BOX.width + 16, height: BOX.height + 16, thickness: 16, cornerRadius: 36 };
// The card that sits above the box.
const CARD = { y: -380, width: 700, height: 560, cornerRadius: 28 };
// The interview was recorded quietly; each clip is raised to a normal speaking level.
const VOICE = 2.2;

export default function Video({ accent, question, wrong }: z.infer<typeof schema>) {
  return (
    <Composition
      fps={30}
      width={1080}
      height={1920}
      background={{ mode: "color", color: "$background" }}
      theme={{ extends: "midnight", palette: { accent, primary: accent } }}
    >
      <Track id="rings" layout="free">
        <Frame id="why-ring" anchor="why" duration={{ until: "why" }} {...RING} />
        <Frame id="hit-ring" anchor="hit" duration={{ until: "hit" }} {...RING} />
        <Frame id="sunsets-ring" anchor="sunsets" duration={{ until: "sunsets" }} {...RING} />
      </Track>

      <Track id="talk">
        {/* "Eclipses don't happen every month because the Moon's orbit is tilted by about five degrees" */}
        <Clip id="why" src="asset:eclipse" volume={VOICE} in="word:5" out="word:19.end" transform={BOXED} />
        {/* "some months … it's going to pass a little bit above the Earth's shadow, and some months … below" */}
        <Clip id="miss" src="asset:eclipse" volume={VOICE} in="word:22" out="word:49.end" transform={FULL} />
        {/* "but about once every six months it actually passes through the Earth's shadow." */}
        <Clip id="hit" src="asset:eclipse" volume={VOICE} in="word:50" out="word:62.end" transform={BOXED} />
        {/* "The best thing about a lunar eclipse is that it's beautiful … shades of orange and red and brown." */}
        <Clip id="red" src="asset:eclipse" volume={VOICE} in="word:128" out="word:152.end" transform={CLOSE} />
        {/* "It's being hit by all of the sunrises and sunsets projected from the Earth" */}
        <Clip id="sunsets" src="asset:eclipse" volume={VOICE} in="word:153" out="word:166.end" transform={BOXED} />
      </Track>

      <Track id="cards" layout="free">
        {/* The question, the wrong answer struck out as he says "because", and the reason on a pill. */}
        <TypeCard
          id="tilt"
          anchor="why"
          duration={{ until: "why" }}
          {...CARD}
          size={64}
          lines={[
            { text: question, tone: "muted", size: 50 },
            { text: wrong, at: "word:8", struck: { at: "word:10" } },
            { text: "TILTED 5°", at: "word:15", pill: "$accent" },
          ]}
        />

        <Badge id="above" anchor="miss" at="word:35" duration={{ until: "miss" }} text="ABOVE" y={125} size={52} />
        <Badge id="below" anchor="miss" at="word:45" duration={{ until: "miss" }} text="BELOW" y={230} size={52} />

        {/* The number is the point, so it gets the card. */}
        <TypeCard
          id="six"
          anchor="hit"
          at="word:52"
          duration={{ until: "hit" }}
          {...CARD}
          size={84}
          lines={[
            { text: "ONCE EVERY", tone: "muted", size: 50 },
            { text: "6 MONTHS", at: "word:54", pill: "$accent" },
            { text: "through Earth's shadow", at: "word:58", size: 44, tone: "muted" },
          ]}
        />

        <Badge id="totality" anchor="red" at="word:143" duration={{ until: "red" }} text="TOTALITY" y={180} size={52} />

        {/* His own sentence as a quotation, the phrase marked as he reaches it. */}
        <QuoteCard
          id="quote"
          anchor="sunsets"
          duration={{ until: "sunsets" }}
          y={-380}
          width={660}
          size={46}
          fill="$surface"
          color="$text"
          source="Ernie Wright, NASA"
          text="The Moon is being hit by all of the sunrises and sunsets projected from the Earth."
          highlights={[{ text: "sunrises and sunsets", at: "word:160" }]}
        />
      </Track>

      <Captions
        id="captions"
        src="asset:eclipse"
        animation="word-highlight"
        maxChars={22}
        style={{ position: "center", size: 60, weight: 800, highlight: "#14141c", highlightBox: "$accent" }}
      />
    </Composition>
  );
}
