import { Clip, Composition, Graphic, Keyframe, Title, Track, Transition } from "@cutcraft/kit";

/** An edit: three shots cut back to back, a wipe and a slide between them, a slow push-in, a title and a lower third. */
export default function Video() {
  return (
    <Composition fps={30} width={960} height={540} theme={{ extends: "midnight", palette: { primary: "#c8402a" } }}>
      <Track id="main" name="Story">
        <Clip id="open" src="asset:aurora" in={0} out={3} fit="cover" />
        <Transition id="x1" type="wipe" duration={0.6} params={{ direction: "left" }} />
        <Clip id="zoom" src="asset:spiral" in={2} out={5.5} fit="cover">
          {/* A slow push-in: two keys on each scale axis. */}
          <Keyframe id="zoom-sx-0" property="transform.scale.x" at={0} value={1} />
          <Keyframe id="zoom-sx-1" property="transform.scale.x" at={3.5} value={1.2} easing="easeInOutSine" />
          <Keyframe id="zoom-sy-0" property="transform.scale.y" at={0} value={1} />
          <Keyframe id="zoom-sy-1" property="transform.scale.y" at={3.5} value={1.2} easing="easeInOutSine" />
        </Clip>
        <Transition id="x2" type="slide" duration={0.6} params={{ direction: "up" }} />
        <Clip id="close" src="asset:cells" in={0} out={2.6} fit="cover" />
      </Track>
      <Track id="text" name="Text">
        <Title
          id="title"
          anchor="open"
          offset={0.3}
          duration={2.2}
          style="h1"
          size={64}
          animation={{ preset: "word-by-word" }}
        >
          Cut by words
        </Title>
        <Graphic
          id="who"
          kind="lower-third"
          name="Every cut is a line"
          role="and every line is editable"
          anchor="zoom"
          offset={0.4}
          duration={2.6}
        />
        <Title id="end" anchor="close" offset={0.2} duration={2.2} style="h2" animation={{ preset: "slide-up" }}>
          The file is the video.
        </Title>
      </Track>
    </Composition>
  );
}
