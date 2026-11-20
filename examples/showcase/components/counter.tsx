import { Composition, Counter, Track } from "@uberscene/kit";

// Counter: a number that counts to its value, then holds, with a label under it.
export default function Video() {
  return (
    <Composition
      fps={30}
      width={1920}
      height={1080}
      theme={{
        extends: "midnight",
        palette: { primary: "#e8a33d", accent: "#e8a33d", background: "#101421", glow: "#3a2a1c" },
      }}
      background={{
        mode: "gradient",
        gradient: {
          type: "linear",
          angle: 135,
          stops: [
            { offset: 0, color: "$background" },
            { offset: 1, color: "$glow" },
          ],
        },
      }}
    >
      <Track id="over" layout="free">
        <Counter id="cups" start={0.2} duration={2.8} to={12400} suffix="+" label="cups poured this year" size={180} />
      </Track>
    </Composition>
  );
}
