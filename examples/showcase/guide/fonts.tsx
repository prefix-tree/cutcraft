import { Clip, Composition, googleFont, Title, Track } from "@cutcraft/kit";

// Two Google Fonts families, downloaded once by the export and loaded from Google by the player.
const display = googleFont("Titan One");
const body = googleFont("Inter Tight", { weights: [400, 700] });

export default function Video() {
  return (
    <Composition fps={30} width={960} height={540} theme={{ extends: "midnight", fonts: { heading: display, body } }}>
      <Track id="main">
        <Clip id="bg" src="asset:aurora" in={0} out={3} fit="cover" />
      </Track>
      <Track id="text" layout="free">
        <Title id="name" start={0.2} duration={2.8} style="h1" size={120}>
          Night Shift
        </Title>
        <Title id="credit" start={0.6} duration={2.4} style="body" transform={{ position: { x: 0, y: 110 } }}>
          Set in Titan One and Inter Tight
        </Title>
      </Track>
    </Composition>
  );
}
