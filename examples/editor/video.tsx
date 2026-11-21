import { Composition, Title, Track } from "@uberscene/kit";

/** A titles-only video, so the example needs no media files. */
export default function Video() {
  return (
    <Composition fps={30} width={1280} height={720} theme={{ extends: "midnight" }}>
      <Track id="headlines" name="Headlines" layout="free">
        <Title id="intro" start={0} duration={2.5} style={{ preset: "h1", size: 96 }}>
          Premiere Pro as code
        </Title>
        <Title id="file" start={3} duration={2.5} style={{ preset: "h1", size: 96 }}>
          A video is a file
        </Title>
        <Title id="outro" start={6} duration={2.5} style={{ preset: "h1", size: 96 }}>
          Edit it anywhere
        </Title>
      </Track>
      <Track id="notes" name="Notes" layout="free">
        <Title id="hint" start={1} duration={4} style={{ size: 36 }} box={{ x: 640, y: 560, origin: "center" }}>
          Select a layer, nudge it, undo it
        </Title>
        <Title id="credit" start={6.5} duration={2} style={{ size: 28 }} box={{ x: 640, y: 620, origin: "center" }}>
          @uberscene/editor + shadcn/ui
        </Title>
      </Track>
    </Composition>
  );
}
