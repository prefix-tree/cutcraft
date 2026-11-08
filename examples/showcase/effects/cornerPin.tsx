import { Clip, Composition, Effect, Keyframe, Track } from "@cutcraft/kit";

// cornerPin: Moves the picture's four corners, to place it in a screen or a frame.
export default function Video() {
  return (
    <Composition fps={30} width={640} height={360}>
      <Track id="main">
        <Clip id="backdrop" src="asset:cells" in={0} out={3} fit="cover" />
      </Track>
      <Track id="pinned">
        <Clip id="shot" src="asset:coffee" in={12} out={15} fit="cover">
          <Effect id="look" type="cornerPin">
            <Keyframe id="k1" param="topLeft" at={0.5} value={[0, 0]} />
            <Keyframe id="k2" param="topLeft" at={1.5} value={[0.2, 0.14]} easing="ease-in-out" />
            <Keyframe id="k3" param="topRight" at={0.5} value={[1, 0]} />
            <Keyframe id="k4" param="topRight" at={1.5} value={[0.84, 0.06]} easing="ease-in-out" />
            <Keyframe id="k5" param="bottomRight" at={0.5} value={[1, 1]} />
            <Keyframe id="k6" param="bottomRight" at={1.5} value={[0.88, 0.9]} easing="ease-in-out" />
            <Keyframe id="k7" param="bottomLeft" at={0.5} value={[0, 1]} />
            <Keyframe id="k8" param="bottomLeft" at={1.5} value={[0.14, 0.82]} easing="ease-in-out" />
          </Effect>
        </Clip>
      </Track>
    </Composition>
  );
}
