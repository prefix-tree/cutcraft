import { Clip, Composition, Frame, Track, TypeCard } from "@cutcraft/kit";

// Frame: a rounded border around part of the picture. Here the footage sits in a box under a card: the clip is
// cropped to the box's shape, scaled to its width and moved to its centre, and the frame is drawn at the same place.
export default function Video() {
  return (
    <Composition
      fps={30}
      width={1080}
      height={1920}
      theme={{ extends: "paper" }}
      background={{ mode: "color", color: "$background" }}
    >
      <Track id="main" layout="free">
        <Clip
          id="shot"
          src="asset:coffee"
          start={0}
          in={12}
          out={15}
          transform={{
            // 920 x 720 of a 960 x 540 picture: its full height and 0.72 of its width.
            crop: { x: 0.14, y: 0, width: 0.72, height: 1 },
            scale: 920 / 1080,
            position: { x: 0, y: 420 },
            borderRadius: 28,
          }}
        />
      </Track>
      <Track id="over" layout="free">
        <TypeCard
          id="card"
          start={0}
          duration={3}
          y={-470}
          width={920}
          height={760}
          fill="$surface"
          cornerRadius={28}
          size={120}
          lines={[
            { text: "POUR", tone: "muted", size: 72 },
            { text: "SLOWLY", offset: 0.5, pill: "$accent" },
          ]}
        />
        <Frame id="speaker" start={0} duration={3} y={420} width={920} height={720} />
      </Track>
    </Composition>
  );
}
