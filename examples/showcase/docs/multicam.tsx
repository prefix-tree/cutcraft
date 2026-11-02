import { Angle, Composition, Cut, Multicam, Title, Track } from "@cutcraft/kit";

export default function Video() {
  return (
    <Composition fps={30} width={960} height={540}>
      <Track id="main" layout="free">
        {/* Three cameras of one take; the cuts pick which one shows when. */}
        <Multicam id="take" sync={0}>
          <Angle id="wide" src="asset:aurora" />
          <Angle id="close" src="asset:spiral" />
          <Angle id="detail" src="asset:cells" />
          <Cut id="c0" at={0} angle="wide" />
          <Cut id="c1" at={1} angle="close" />
          <Cut id="c2" at={2} angle="detail" />
        </Multicam>
      </Track>
      <Track id="text" layout="free">
        <Title id="live" start={0} duration={3} size={40}>
          Live
        </Title>
      </Track>
    </Composition>
  );
}
