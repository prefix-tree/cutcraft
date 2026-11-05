import { Clip, Composition, Motion, Track } from "@cutcraft/kit";

// A puck that crosses the frame in under a second and comes back: each exported frame averages
// 8 moments across a half-frame shutter, so it smears the way a film camera would.
export default function Video() {
  return (
    <Composition fps={30} width={960} height={540} motionBlur={{ shutterAngle: 180, samples: 8 }}>
      <Track id="main">
        <Clip id="bg" src="asset:cells" in={0} out={3} fit="cover" />
      </Track>
      <Track id="fx" layout="free">
        <Motion
          id="puck"
          start={0}
          duration={3}
          sequence={[
            [".puck", { x: [-180, 1000] }, { duration: 1.4, ease: "easeInOut" }],
            [".puck", { x: [1000, -180] }, { duration: 1.4, ease: "easeInOut" }],
          ]}
        >
          <div
            className="puck"
            style={{
              position: "absolute",
              left: 0,
              top: 200,
              width: 140,
              height: 140,
              borderRadius: 70,
              background: "#e8a33d",
            }}
          />
        </Motion>
      </Track>
    </Composition>
  );
}
