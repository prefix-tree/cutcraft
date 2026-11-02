import { Clip, Composition, Keyframe, Track } from "@cutcraft/kit";

export default function Video() {
  return (
    <Composition fps={30} width={960} height={540}>
      <Track id="main">
        {/* A slow push-in: two keys on each scale axis. */}
        <Clip id="shot" src="asset:spiral" in={0} out={3} fit="cover">
          <Keyframe id="sx0" property="transform.scale.x" at={0} value={1} />
          <Keyframe id="sx1" property="transform.scale.x" at={3} value={1.4} easing="easeInOutSine" />
          <Keyframe id="sy0" property="transform.scale.y" at={0} value={1} />
          <Keyframe id="sy1" property="transform.scale.y" at={3} value={1.4} easing="easeInOutSine" />
        </Clip>
      </Track>
    </Composition>
  );
}
