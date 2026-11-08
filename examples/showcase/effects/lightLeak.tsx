import { Clip, Composition, Effect, Keyframe, Track } from "@cutcraft/kit";

// lightLeak: Washes warm light in from the edges, as light leaking into a film camera.
export default function Video() {
  return (
    <Composition fps={30} width={640} height={360}>
      <Track id="main">
        <Clip id="shot" src="asset:coffee" in={12} out={15} fit="cover">
          <Effect id="look" type="lightLeak" params={{ evolution: 0.4 }}>
            <Keyframe id="k1" param="intensity" at={0.5} value={0} />
            <Keyframe id="k2" param="intensity" at={1.5} value={0.7} easing="ease-in-out" />
          </Effect>
        </Clip>
      </Track>
    </Composition>
  );
}
