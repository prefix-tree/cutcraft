import { Clip, Composition, Track, Transition } from "@cutcraft/kit";

export default function Video() {
  return (
    <Composition fps={30} width={960} height={540}>
      <Track id="main">
        <Clip id="a" src="asset:aurora" in={0} out={2} fit="cover" />
        <Transition id="wipe" type="wipe" duration={0.8} params={{ direction: "left" }} />
        <Clip id="b" src="asset:cells" in={0} out={2} fit="cover" />
      </Track>
    </Composition>
  );
}
