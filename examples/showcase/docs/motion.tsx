import { Clip, Composition, Motion, Track } from "@uberscene/kit";

export default function Video() {
  return (
    <Composition fps={30} width={960} height={540}>
      <Track id="main">
        <Clip id="shot" src="asset:coffeeWide" in={12} out={15} fit="cover" />
      </Track>
      <Track id="text" layout="free">
        {/* A Motion sequence over the tag's children: each step names a selector inside it. */}
        <Motion
          id="headline"
          anchor="shot"
          duration={3}
          sequence={[
            ["h1", { opacity: [0, 1], y: [40, 0] }, { duration: 0.6, ease: "easeOut" }],
            [".rule", { scaleX: [0, 1] }, { at: 0.3, duration: 0.8 }],
          ]}
        >
          <h1
            style={{
              position: "absolute",
              left: 56,
              top: 360,
              margin: 0,
              textAlign: "left",
              color: "#ffffff",
              font: "700 84px Inter, sans-serif",
            }}
          >
            Bloom
          </h1>
          <div
            className="rule"
            style={{
              position: "absolute",
              left: 60,
              width: 220,
              top: 466,
              height: 6,
              background: "#e8a33d",
              transformOrigin: "left",
            }}
          />
        </Motion>
      </Track>
    </Composition>
  );
}
