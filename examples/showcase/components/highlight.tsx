import { Background, Composition, Highlight, Title, Track } from "@cutcraft/kit";

// Highlight: a hand-drawn mark on something already in the frame; here a circle round a word.
export default function Video() {
  return (
    <Composition fps={30} width={1920} height={1080}>
      <Track id="back" layout="free">
        <Background id="bg" start={0} duration={3} variant="grid" />
      </Track>
      <Track id="over" layout="free">
        <Title id="line" start={0} duration={3} size={120} font="$heading">
          Cut on words
        </Title>
        <Highlight id="ring" start={0.6} duration={2.4} variant="circle" width={860} height={180} />
      </Track>
    </Composition>
  );
}
