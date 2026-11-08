import { Clip, Composition, Effect, Keyframe, Track } from "@cutcraft/kit";

// halftone: Prints the picture as a screen of dots, in one ink or four.
export default function Video() {
  return (
    <Composition fps={30} width={640} height={360}>
      <Track id="main">
        <Clip id="shot" src="asset:coffee" in={12} out={15} fit="cover">
          <Effect id="look" type="halftone" params={{ size: 7 }}>
            <Keyframe id="k1" param="amount" at={0.5} value={0} />
            <Keyframe id="k2" param="amount" at={1.5} value={1} easing="ease-in-out" />
          </Effect>
        </Clip>
      </Track>
    </Composition>
  );
}
