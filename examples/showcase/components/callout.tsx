import { Callout, Clip, Composition, Track } from "@cutcraft/kit";

// Callout: a note in a box, with a line drawn to what it is about.
export default function Video() {
  return (
    <Composition fps={30} width={1920} height={1080}>
      <Track id="main">
        <Clip id="shot" src="asset:coffee" in={12} out={15} fit="cover" />
      </Track>
      <Track id="over" layout="free">
        <Callout
          id="tip"
          start={0.4}
          duration={2.6}
          text="Bloom for 30 seconds"
          x={520}
          y={-300}
          to={{ x: 60, y: 40 }}
        />
      </Track>
    </Composition>
  );
}
