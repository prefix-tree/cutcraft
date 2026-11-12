import { Composition, Track, TypeCard } from "@cutcraft/kit";

// TypeCard: big type that builds line by line. A line can sit on a pill, and a line can be struck out.
export default function Video() {
  return (
    <Composition fps={30} width={1920} height={1080} theme={{ extends: "paper" }}>
      <Track id="over" layout="free">
        <TypeCard
          id="job"
          start={0}
          duration={3}
          size={150}
          lines={[
            { text: "COFFEE IS", tone: "muted", size: 84 },
            { text: "BITTER", offset: 0.4, struck: { offset: 1.2 } },
            { text: "SWEET", offset: 1.5, pill: "$accent" },
            { text: "when it is fresh", offset: 1.9, size: 64, tone: "muted" },
          ]}
        />
      </Track>
    </Composition>
  );
}
