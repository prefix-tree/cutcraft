import { Clip, Composition, Shape, Track } from "@cutcraft/kit";

export default function Video() {
  return (
    <Composition fps={30} width={960} height={540}>
      {/* A sequence track: clips play back to back, in order. */}
      <Track id="main">
        <Clip id="a" src="asset:aurora" in={0} out={2} fit="cover" />
        <Clip id="b" src="asset:cells" in={0} out={2} fit="cover" />
      </Track>
      {/* A free track: each element sits at its own start. */}
      <Track id="marks" layout="free">
        <Shape
          id="dot"
          start={0.5}
          duration={3}
          shape="circle"
          width={90}
          height={90}
          fill="#c8402a"
          transform={{ position: { x: 360, y: -170 } }}
        />
      </Track>
    </Composition>
  );
}
