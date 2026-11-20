import { Clip, Composition, Effect, Keyframe, Track } from "@uberscene/kit";

// cornerPin: Moves the picture's four corners, to place it in a screen or a frame.
export default function Video() {
  return (
    <Composition fps={30} width={640} height={360}>
      <Track id="main">
        <Clip id="backdrop" src="asset:coffeeWide" in={4} out={7} fit="cover" />
      </Track>
      <Track id="pinned">
        <Clip id="shot" src="asset:coffee" in={12} out={15} fit="cover">
          <Effect id="look" type="cornerPin">
            <Keyframe id="k1" param="topLeft" at={0.5} value={[0, 0]} easing="easeInOut" />
            <Keyframe id="k2" param="topLeft" at={1.5} value={[0.2, 0.14]} />
            <Keyframe id="k3" param="topRight" at={0.5} value={[1, 0]} easing="easeInOut" />
            <Keyframe id="k4" param="topRight" at={1.5} value={[0.84, 0.06]} />
            <Keyframe id="k5" param="bottomRight" at={0.5} value={[1, 1]} easing="easeInOut" />
            <Keyframe id="k6" param="bottomRight" at={1.5} value={[0.88, 0.9]} />
            <Keyframe id="k7" param="bottomLeft" at={0.5} value={[0, 1]} easing="easeInOut" />
            <Keyframe id="k8" param="bottomLeft" at={1.5} value={[0.14, 0.82]} />
          </Effect>
        </Clip>
      </Track>
    </Composition>
  );
}
