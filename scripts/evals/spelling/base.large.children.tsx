import { Clip, Composition, Effect, Keyframe, Track } from "@uberscene/kit";

export default function Video() {
  return (
    <Composition fps={30} width={960} height={540}>
      <Track id="main">
        <Clip id="a" src="asset:coffeeWide" in={4} out={7} fit="cover" />
        <Clip id="b" src="asset:espresso" in={2} out={5.5} fit="cover">
          <Keyframe id="b-sx-0" property="transform.scale.x" at={0} value={1} easing="ease-in-out" />
          <Keyframe id="b-sx-1" property="transform.scale.x" at={3.5} value={1.2} />
          <Keyframe id="b-sy-0" property="transform.scale.y" at={0} value={1} easing="ease-in-out" />
          <Keyframe id="b-sy-1" property="transform.scale.y" at={3.5} value={1.2} />
        </Clip>
        <Clip id="c" src="asset:redCup" in={18} out={20.6} fit="cover">
          <Effect id="c-blur" type="blur">
            <Keyframe id="c-blur-0" param="radius" at={0} value={0} easing="ease-in-out" />
            <Keyframe id="c-blur-1" param="radius" at={2} value={8} />
          </Effect>
        </Clip>
        <Clip id="d" src="asset:coffee" in={1} out={5} fit="cover" />
        <Clip id="e" src="asset:espresso" in={20} out={22} fit="cover">
          <Keyframe id="e-o-0" property="transform.opacity" at={0} value={0} />
          <Keyframe id="e-o-1" property="transform.opacity" at={0.5} value={1} />
          <Effect id="e-blur" type="blur" params={{ radius: 2 }} />
        </Clip>
        <Clip id="f" src="asset:redCup" in={10} out={12.4} fit="cover" />
      </Track>
    </Composition>
  );
}
