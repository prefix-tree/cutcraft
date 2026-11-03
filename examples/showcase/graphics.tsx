import { Composition, Graphic, Track } from "@cutcraft/kit";

/** Numbers as props: each data graphic animates in on its own and stays editable in the inspector. */
export default function Video() {
  return (
    <Composition fps={30} width={960} height={540} theme={{ extends: "midnight", palette: { primary: "#c8402a" } }}>
      <Track id="data" layout="free">
        <Graphic
          id="count"
          kind="counter"
          to={1250}
          suffix="+"
          label="customers"
          width={280}
          height={130}
          start={0}
          duration={5}
          transform={{ position: { x: -260, y: -140 } }}
        />
        <Graphic
          id="units"
          kind="unit-grid"
          total={10}
          filled={7.5}
          label="7.5 in 10 viewers"
          width={300}
          height={170}
          start={0.3}
          duration={4.7}
          transform={{ position: { x: 220, y: -130 } }}
        />
        <Graphic
          id="compare"
          kind="comparison"
          items={[
            { label: "By hand", value: 6, color: "$muted" },
            { label: "CutCraft", value: 1.5 },
          ]}
          suffix=" h"
          decimals={1}
          width={400}
          height={150}
          start={0.6}
          duration={4.4}
          transform={{ position: { x: -230, y: 130 } }}
        />
        <Graphic
          id="sample"
          kind="sample-size"
          n={1200}
          share={0.38}
          label="{share} of {n} said yes"
          width={380}
          height={210}
          start={0.9}
          duration={4.1}
          transform={{ position: { x: 240, y: 125 } }}
        />
      </Track>
    </Composition>
  );
}
