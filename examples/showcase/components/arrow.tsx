import { Arrow, Clip, Composition, Track } from "@uberscene/kit";

// Arrow: drawn from one point to another, bowed by `curve`.
export default function Video() {
  return (
    <Composition
      fps={30}
      width={1920}
      height={1080}
      theme={{ extends: "midnight", palette: { primary: "#e8a33d", accent: "#e8a33d" } }}
    >
      <Track id="main">
        <Clip id="shot" src="asset:coffeeWide" in={4} out={7} fit="cover" />
      </Track>
      <Track id="over" layout="free">
        <Arrow
          id="kettle"
          start={0.4}
          duration={2.6}
          from={{ x: 340, y: 220 }}
          to={{ x: 820, y: 280 }}
          curve={-120}
          width={10}
        />
      </Track>
    </Composition>
  );
}
