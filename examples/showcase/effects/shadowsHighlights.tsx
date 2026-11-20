import { Clip, Composition, Track } from "@uberscene/kit";

// shadowsHighlights: Opens up the shadows or holds back the highlights.
export default function Video() {
  return (
    <Composition fps={30} width={640} height={360}>
      <Track id="main">
        <Clip
          id="shot"
          src="asset:coffeeWide"
          in={4}
          out={7}
          fit="cover"
          effects={[
            {
              type: "shadowsHighlights",
              shadows: [
                { at: 0.5, value: 0, easing: "ease-in-out" },
                { at: 1.5, value: 0.7 },
              ],
            },
          ]}
        />
      </Track>
    </Composition>
  );
}
