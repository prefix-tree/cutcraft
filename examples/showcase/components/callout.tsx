import { Callout, Clip, Composition, Track } from "@uberscene/kit";

// Callout: a note in a box, with a line drawn to what it is about.
export default function Video() {
  return (
    <Composition
      fps={30}
      width={1920}
      height={1080}
      theme={{ extends: "midnight", palette: { primary: "#e8a33d", accent: "#e8a33d" } }}
    >
      <Track id="main">
        <Clip id="shot" src="asset:redCup" in={18} out={21} fit="cover" />
      </Track>
      <Track id="over" layout="free">
        <Callout
          id="tip"
          start={0.4}
          duration={2.6}
          text="Double shot, 36 g"
          x={520}
          y={-300}
          width={520}
          to={{ x: 60, y: 40 }}
        />
      </Track>
    </Composition>
  );
}
