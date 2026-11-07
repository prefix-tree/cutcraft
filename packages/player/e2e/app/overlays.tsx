import { Adjustment, Clip, Composition, Effect, Track } from "@cutcraft/kit";

export { manifest } from "./composition";

export const defaults = {};

/** Solid blue footage under an adjustment that halves its brightness. */
export default function Video() {
  return (
    <Composition fps={30} width={640} height={360} background={{ mode: "color", color: "#000000" }}>
      <Track id="main">
        <Clip id="solid" src="asset:solid" in={0} out={1} />
      </Track>
      <Track id="adj" layout="free">
        <Adjustment id="adj1" start={0} duration={1}>
          <Effect id="e1" type="brightness" params={{ amount: -0.5 }} />
        </Adjustment>
      </Track>
    </Composition>
  );
}
