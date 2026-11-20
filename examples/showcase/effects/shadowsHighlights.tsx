import { Clip, Composition, Effect, Keyframe, Track } from "@uberscene/kit";

// shadowsHighlights: Opens up the shadows or holds back the highlights.
export default function Video() {
  return (
    <Composition fps={30} width={640} height={360}>
      <Track id="main">
        <Clip id="shot" src="asset:coffeeWide" in={4} out={7} fit="cover">
          <Effect id="look" type="shadowsHighlights">
            <Keyframe id="k1" param="shadows" at={0.5} value={0} easing="ease-in-out" />
            <Keyframe id="k2" param="shadows" at={1.5} value={0.7} />
          </Effect>
        </Clip>
      </Track>
    </Composition>
  );
}
