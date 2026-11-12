import { Background, Composition, QuoteCard, Track } from "@cutcraft/kit";

// QuoteCard: a passage with its source, and a marker that sweeps across the phrases that matter.
export default function Video() {
  return (
    <Composition fps={30} width={1920} height={1080} theme={{ extends: "paper" }}>
      <Track id="back" layout="free">
        <Background id="bg" start={0} duration={4} variant="dots" />
      </Track>
      <Track id="over" layout="free">
        <QuoteCard
          id="quote"
          start={0.2}
          duration={3.8}
          width={1100}
          size={44}
          source="A barista's handbook, on freshness"
          text="Roasted coffee is at its best between four and fourteen days after roasting. Once ground, it loses most of its aroma within fifteen minutes."
          highlights={[
            { text: "four and fourteen days", offset: 0.8 },
            { text: "within fifteen minutes", offset: 2 },
          ]}
        />
      </Track>
    </Composition>
  );
}
