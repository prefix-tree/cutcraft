import { Background, Composition, Counter, Track } from "@cutcraft/kit";

// Counter: a number that counts to its value, then holds, with a label under it.
export default function Video() {
  return (
    <Composition fps={30} width={1920} height={1080}>
      <Track id="back" layout="free">
        <Background id="bg" start={0} duration={3} variant="gradient" />
      </Track>
      <Track id="over" layout="free">
        <Counter id="cups" start={0.2} duration={2.8} to={12400} suffix="+" label="cups poured this year" size={180} />
      </Track>
    </Composition>
  );
}
