import { Composition, Shape, Track } from "@uberscene/kit";

export default function Video() {
  return (
    <Composition fps={30} width={960} height={540} background={{ type: "color", color: "#101421" }}>
      <Track id="shapes" layout="free">
        <Shape
          id="card"
          start={0}
          duration={3}
          type="rectangle"
          width={360}
          height={200}
          fill="#f3ead6"
          cornerRadius={24}
          box={{ x: 310, y: 270, origin: "center" }}
          enter={{ type: "slideUp", duration: 0.6 }}
        />
        <Shape
          id="ring"
          start={0.4}
          duration={2.6}
          type="circle"
          width={180}
          height={180}
          fill={{ type: "none" }}
          stroke={{ color: "#e8a33d", thickness: 14 }}
          box={{ x: 700, y: 270, origin: "center" }}
          enter={{ type: "scale", duration: 0.5 }}
        />
      </Track>
    </Composition>
  );
}
