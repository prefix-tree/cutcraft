import { Background, Composition, Title, Track } from "@cutcraft/kit";

// Background: a full-frame backdrop on the track beneath everything; dots here, or a gradient or a grid.
export default function Video() {
  return (
    <Composition fps={30} width={1920} height={1080}>
      <Track id="back" layout="free">
        <Background id="bg" start={0} duration={3} variant="dots" spacing={56} />
      </Track>
      <Track id="over" layout="free">
        <Title
          id="name"
          start={0.3}
          duration={2.7}
          size={120}
          font="$heading"
          enter={{ type: "slide-up", duration: 0.5 }}
        >
          Shed Coffee
        </Title>
      </Track>
    </Composition>
  );
}
