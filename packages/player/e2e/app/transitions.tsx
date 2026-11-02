import { Clip, Composition, Track, Transition } from "@cutcraft/kit";
export { manifest } from "./composition";

export const defaults = {};

/** Half-size solid blue over a blur background, wiped left into a red image: solid 0–2, wipe 1–2, img 1–3. */
export default function Video() {
  return (
    <Composition fps={30} width={640} height={360} background={{ mode: "blur", color: "#000000" }}>
      <Track id="main">
        <Clip id="solid" src="asset:solid" in={0} out={2} transform={{ scale: 0.5 }} />
        <Transition id="w" type="wipe" duration={1} params={{ direction: "left", curve: "linear" }} />
        <Clip id="img" src="asset:logo" duration={2} fit="cover" />
      </Track>
    </Composition>
  );
}
