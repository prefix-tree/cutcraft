import { Captions, Clip, Composition, Title, Track } from "@cutcraft/kit";

/** A vertical short: captions come from the words the clip plays, and the key point starts on the word that names it. */
export default function Video() {
  return (
    <Composition fps={30} width={540} height={960} theme={{ extends: "midnight", palette: { primary: "#c8402a" } }}>
      <Track id="main" name="Speaker">
        <Clip id="talk" src="asset:speaker" in="word:0" out="word:24.end" fit="cover" />
      </Track>
      <Track id="points" name="Key points">
        <Title
          id="point"
          anchor="talk"
          at="word:16"
          duration={3.4}
          style="note"
          width={420}
          height={84}
          size={34}
          transform={{ position: { x: 0, y: 115 }, borderRadius: 18 }}
        >
          The point lands here
        </Title>
      </Track>
      <Captions id="captions" src="asset:speaker" style={{ size: 34 }} animation="karaoke" />
    </Composition>
  );
}
