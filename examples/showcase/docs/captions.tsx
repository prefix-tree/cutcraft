import { Captions, Clip, Composition, Track } from "@cutcraft/kit";

export default function Video() {
  return (
    <Composition fps={30} width={540} height={960}>
      <Track id="main">
        <Clip id="talk" src="asset:speaker" in="word:0" out="word:12.end" fit="cover" />
      </Track>
      {/* Words come from the clip's transcript and follow it through every trim. */}
      <Captions id="captions" src="asset:speaker" animation="karaoke" style={{ size: 36 }} />
    </Composition>
  );
}
