import { Clip, Composition, Effect, Keyframe, Track } from "@cutcraft/kit";

// exposure: Brightens or darkens in stops, as a camera would.
export default function Video() {
  return (
    <Composition fps={30} width={640} height={360}>
      <Track id="main">
        <Clip id="shot" src="asset:coffee" in={12} out={15} fit="cover">
          <Effect id="look" type="exposure">
            <Keyframe id="k1" param="stops" at={0.5} value={0} />
            <Keyframe id="k2" param="stops" at={1.5} value={1} easing="ease-in-out" />
          </Effect>
        </Clip>
      </Track>
    </Composition>
  );
}
