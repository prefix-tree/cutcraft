import { Clip, Composition, Motion, Track } from "@cutcraft/kit";

export default function Video() {
  return (
    <Composition fps={30} width={960} height={540}>
      <Track id="main">
        <Clip id="shot" src="asset:aurora" in={0} out={3} fit="cover" />
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
              left: 0,
              right: 0,
              top: 200,
              margin: 0,
              textAlign: "center",
              color: "#ffffff",
              font: "700 84px Inter, sans-serif",
            }}
          >
            Launch
          </h1>
          <div
            className="rule"
            style={{
              position: "absolute",
              left: 330,
              width: 300,
              top: 310,
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
