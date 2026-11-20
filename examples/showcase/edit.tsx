import { Clip, Composition, Keyframe, Motion, Title, Track, Transition } from "@uberscene/kit";

/** An edit: three shots cut back to back, a wipe and a slide between them, a slow push-in, a title and a Motion lower third. */
export default function Video() {
  return (
    <Composition fps={30} width={960} height={540} theme={{ extends: "midnight", palette: { primary: "#e8a33d" } }}>
      <Track id="main" name="Story">
        <Clip id="open" src="asset:coffeeWide" in={4} out={7} fit="cover" />
        <Transition id="x1" type="wipe" duration={0.6} params={{ direction: "left" }} />
        <Clip id="zoom" src="asset:espresso" in={2} out={5.5} fit="cover">
          {/* A slow push-in: two keys on each scale axis. */}
          <Keyframe id="zoom-sx-0" property="transform.scale.x" at={0} value={1} easing="easeInOutSine" />
          <Keyframe id="zoom-sx-1" property="transform.scale.x" at={3.5} value={1.2} />
          <Keyframe id="zoom-sy-0" property="transform.scale.y" at={0} value={1} easing="easeInOutSine" />
          <Keyframe id="zoom-sy-1" property="transform.scale.y" at={3.5} value={1.2} />
        </Clip>
        <Transition id="x2" type="slide" duration={0.6} params={{ direction: "up" }} />
        <Clip id="close" src="asset:redCup" in={18} out={20.6} fit="cover" />
      </Track>
      <Track id="text" name="Text">
        <Title
          id="title"
          anchor="open"
          offset={0.3}
          duration={2.2}
          style="h1"
          size={64}
          width={420}
          align="left"
          transform={{ position: { x: -240, y: -170 } }}
          animation={{ preset: "word-by-word" }}
        >
          Slow pour
        </Title>
        <Motion
          id="who"
          anchor="zoom"
          offset={0.4}
          duration={2.6}
          sequence={[
            [".bar", { scaleX: [0, 1] }, { duration: 0.4, ease: "easeOut" }],
            [".name", { opacity: [0, 1], x: [-20, 0] }, { at: 0.15, duration: 0.35 }],
            [".role", { opacity: [0, 1], x: [-20, 0] }, { at: 0.3, duration: 0.35 }],
          ]}
        >
          <div
            className="bar"
            style={{
              position: "absolute",
              left: 48,
              top: 404,
              width: 6,
              height: 70,
              background: "#e8a33d",
              transformOrigin: "left",
            }}
          />
          <div
            className="name"
            style={{
              position: "absolute",
              left: 68,
              top: 402,
              color: "#f4efe6",
              font: "700 32px 'Space Grotesk', sans-serif",
            }}
          >
            Thirty-second bloom
          </div>
          <div
            className="role"
            style={{ position: "absolute", left: 68, top: 444, color: "#c9c2b8", font: "500 20px Inter, sans-serif" }}
          >
            then pour in slow circles
          </div>
        </Motion>
        <Title
          id="end"
          anchor="close"
          offset={0.2}
          duration={2.2}
          style="h2"
          width={420}
          align="left"
          transform={{ position: { x: 240, y: -170 } }}
          animation={{ preset: "slide-up" }}
        >
          Ready in four minutes.
        </Title>
      </Track>
    </Composition>
  );
}
