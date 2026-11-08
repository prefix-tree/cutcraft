import { Clip, Composition, Effect, Keyframe, Track } from "@cutcraft/kit";

// regionBlur: Blurs a box of the frame, to hide a face, a plate or a screen.
export default function Video() {
  return (
    <Composition fps={30} width={640} height={360}>
      <Track id="main">
        <Clip id="shot" src="asset:coffee" in={12} out={15} fit="cover">
          <Effect id="look" type="regionBlur" params={{ radius: 12, roundness: 0.5 }}>
            <Keyframe id="k1" param="box" at={0.5} value={[0.1, 0.25, 0.3, 0.45]} />
            <Keyframe id="k2" param="box" at={1.5} value={[0.55, 0.25, 0.3, 0.45]} easing="ease-in-out" />
          </Effect>
        </Clip>
      </Track>
    </Composition>
  );
}
