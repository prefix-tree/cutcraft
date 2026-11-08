import { Badge, Clip, Composition, Track } from "@cutcraft/kit";

// Badge: a short word on a pill that pops in.
export default function Video() {
  return (
    <Composition fps={30} width={1920} height={1080}>
      <Track id="main">
        <Clip id="shot" src="asset:coffee" in={12} out={15} fit="cover" />
      </Track>
      <Track id="over" layout="free">
        <Badge id="new" start={0.4} duration={2.6} text="New roast" x={640} y={-380} size={44} />
      </Track>
    </Composition>
  );
}
