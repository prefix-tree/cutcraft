import { Composition, Shape, Track } from "@uberscene/kit";

export default function Video() {
  return (
    <Composition fps={30} width={960} height={540} background={{ mode: "color", color: "#101421" }}>
      <Track id="shapes" layout="free">
        <Shape
          id="card"
          start={0}
          duration={3}
          shape="rectangle"
          width={360}
          height={200}
          fill="#f3ead6"
          cornerRadius={24}
          transform={{ position: { x: -170, y: 0 } }}
          enter={{ type: "slide-up", duration: 0.6 }}
        />
        <Shape
          id="ring"
          start={0.4}
          duration={2.6}
          shape="circle"
          width={180}
          height={180}
          fill={{ type: "none" }}
          stroke={{ color: "#e8a33d", width: 14 }}
          transform={{ position: { x: 220, y: 0 } }}
          enter={{ type: "scale", duration: 0.5 }}
        />
      </Track>
    </Composition>
  );
}
