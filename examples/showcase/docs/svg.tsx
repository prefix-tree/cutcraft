import { Composition, Svg, Track } from "@cutcraft/kit";

export default function Video() {
  return (
    <Composition fps={30} width={960} height={540} background={{ mode: "color", color: "#101421" }}>
      <Track id="art" layout="free">
        <Svg id="sun" start={0} duration={3} transform={{ scale: 4 }} enter={{ type: "fade", duration: 0.6 }}
          content="<svg viewBox='0 0 100 100'><circle cx='50' cy='50' r='26' fill='#e0a458'/><g stroke='#e0a458' stroke-width='5' stroke-linecap='round'><path d='M50 6v12M50 82v12M6 50h12M82 50h12M19 19l8 8M73 73l8 8M19 81l8-8M73 27l8-8'/></g></svg>" />
      </Track>
    </Composition>
  );
}
