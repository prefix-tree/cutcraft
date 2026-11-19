import { Background, Composition, Highlight, Title, Track } from "@uberscene/kit";

// Highlight: a hand-drawn mark on something already in the frame; here a circle round a word.
export default function Video() {
  return (
    <Composition
      fps={30}
      width={1920}
      height={1080}
      theme={{ extends: "midnight", palette: { primary: "#e8a33d", accent: "#e8a33d" } }}
    >
      <Track id="back" layout="free">
        <Background id="bg" start={0} duration={3} variant="grid" />
      </Track>
      <Track id="over" layout="free">
        <Title id="line" start={0} duration={3} size={120} font="$heading">
          Grind it fresh
        </Title>
        <Highlight id="ring" start={0.6} duration={2.4} variant="circle" width={980} height={180} />
      </Track>
    </Composition>
  );
}
