import { Clip, Composition, googleFont, Title, Track } from "@uberscene/kit";

// Two Google Fonts families, downloaded once by the export and loaded from Google by the player.
const display = googleFont("Titan One");
const body = googleFont("Inter Tight", { weights: [400, 700] });

export default function Video() {
  return (
    <Composition fps={30} width={960} height={540} theme={{ extends: "midnight", fonts: { heading: display, body } }}>
      <Track id="main">
        <Clip id="bg" src="asset:coffeeWide" in={4} out={7} fit="cover" />
      </Track>
      <Track id="text" layout="free">
        <Title
          id="name"
          start={0.2}
          duration={2.8}
          style="h1"
          size={104}
          width={720}
          align="left"
          transform={{ position: { x: -100, y: 150 } }}
        >
          Night Shift
        </Title>
        <Title
          id="credit"
          start={0.6}
          duration={2.4}
          style="body"
          width={720}
          align="left"
          transform={{ position: { x: -100, y: 222 } }}
        >
          Set in Titan One and Inter Tight
        </Title>
      </Track>
    </Composition>
  );
}
