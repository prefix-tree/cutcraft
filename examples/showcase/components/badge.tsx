import { Badge, Clip, Composition, Track } from "@uberscene/kit";

// Badge: a short word on a pill that pops in.
export default function Video() {
  return (
    <Composition
      fps={30}
      width={1920}
      height={1080}
      theme={{ extends: "midnight", palette: { primary: "#e8a33d", accent: "#e8a33d" } }}
    >
      <Track id="main">
        <Clip id="shot" src="asset:espresso" in={2} out={5} fit="cover" />
      </Track>
      <Track id="over" layout="free">
        <Badge id="new" start={0.4} duration={2.6} text="New roast" box={{ x: 1600, y: 160 }} size={60} />
      </Track>
    </Composition>
  );
}
