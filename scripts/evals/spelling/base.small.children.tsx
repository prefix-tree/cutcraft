import { Clip, Composition, Effect, Keyframe, Title, Track, Transition } from "@uberscene/kit";

export default function Video() {
  return (
    <Composition fps={30} width={960} height={540}>
      <Track id="main">
        <Clip id="open" src="asset:coffeeWide" in={4} out={7} fit="cover" />
        <Transition id="x1" type="wipe" duration={0.6} params={{ direction: "left" }} />
        <Clip id="zoom" src="asset:espresso" in={2} out={5.5} fit="cover">
          <Keyframe id="zoom-sx-0" property="transform.scale.x" at={0} value={1} easing="ease-in-out" />
          <Keyframe id="zoom-sx-1" property="transform.scale.x" at={3.5} value={1.2} />
          <Keyframe id="zoom-sy-0" property="transform.scale.y" at={0} value={1} easing="ease-in-out" />
          <Keyframe id="zoom-sy-1" property="transform.scale.y" at={3.5} value={1.2} />
        </Clip>
        <Clip id="close" src="asset:redCup" in={18} out={20.6} fit="cover">
          <Effect id="soft" type="blur">
            <Keyframe id="soft-0" param="radius" at={0} value={0} easing="ease-in-out" />
            <Keyframe id="soft-1" param="radius" at={2} value={8} />
          </Effect>
        </Clip>
      </Track>
      <Track id="text" layout="free">
        <Title id="title" start={0.3} duration={2.2} box={{ x: 240, y: 100, origin: "center" }}>
          Slow pour
        </Title>
      </Track>
    </Composition>
  );
}
