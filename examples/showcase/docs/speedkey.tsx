import { Clip, Composition, SpeedKey, Track } from "@cutcraft/kit";

export default function Video() {
  return (
    <Composition fps={30} width={960} height={540}>
      <Track id="main">
        {/* Normal speed, easing into a four-times speed-up. */}
        <Clip id="ramp" src="asset:cells" in={0} out={8} fit="cover">
          <SpeedKey id="s0" at={0} speed={1} />
          <SpeedKey id="s1" at={1} speed={4} easing="easeInOutQuad" />
        </Clip>
      </Track>
    </Composition>
  );
}
