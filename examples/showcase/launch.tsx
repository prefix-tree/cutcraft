import { z } from "zod";

import { Clip, Composition, Motion, Three, Track, Transition } from "@uberscene/kit";

export const schema = z.object({ product: z.string(), founder: z.string(), accent: z.string() });
export const defaults = { product: "Halvard", founder: "Maya Chen", accent: "#e8a33d" };

const pill = {
  position: "absolute",
  left: 56,
  padding: "14px 22px",
  borderRadius: 999,
  background: "rgba(16, 20, 33, 0.82)",
  color: "#f4efe6",
  font: "600 30px 'Space Grotesk', sans-serif",
  letterSpacing: "-0.01em",
} as const;

/**
 * A roastery's launch: the founder at the bench, a three.js bag of the new roast turning beside them, and each promise
 * called out on the word that names it. Trim the founder's clip and every callout moves with its word.
 */
export default function Video({ product, founder, accent }: z.infer<typeof schema>) {
  return (
    <Composition fps={30} width={960} height={540} theme={{ extends: "midnight", palette: { primary: accent } }}>
      <Track id="main" name="Founder">
        <Clip id="talk" src="asset:founder" in="word:0" out="word:11.end" fit="cover" />
        <Transition id="x1" type="crossfade" duration={0.4} />
        <Clip id="broll" src="asset:product" in={0} out={1.6} fit="cover" />
        <Transition id="x2" type="crossfade" duration={0.4} />
        <Clip id="close" src="asset:founder" in="word:12" out="word:25.end" fit="cover" />
      </Track>

      <Track id="bag" name="Bag" layout="free">
        {/* The bag turns in as the founder says the roastery's name, and keeps turning to the end. */}
        <Three
          id="roast"
          anchor="talk"
          at="word:1"
          duration={12}
          camera={{ position: [0, 0, 6], fov: 35 }}
          setup={({ scene, THREE }) => {
            // A kraft paper bag, a little rounded by its shading, with a printed label on the front.
            const bag = new THREE.Mesh(
              new THREE.BoxGeometry(1.5, 2.3, 0.55),
              new THREE.MeshStandardMaterial({ color: "#b0875c", metalness: 0, roughness: 0.92 }),
            );
            const art = document.createElement("canvas");
            art.width = 300;
            art.height = 420;
            const g = art.getContext("2d") as CanvasRenderingContext2D;
            g.fillStyle = "#f4efe6";
            g.fillRect(0, 0, 300, 420);
            g.fillStyle = accent;
            g.fillRect(0, 0, 300, 18);
            g.fillStyle = "#101421";
            g.textAlign = "center";
            g.font = "700 52px 'Space Grotesk', sans-serif";
            g.fillText(product.toUpperCase(), 150, 150);
            g.font = "500 24px Inter, sans-serif";
            g.fillText("Monday roast", 150, 200);
            g.fillRect(110, 240, 80, 3);
            g.font = "500 22px Inter, sans-serif";
            g.fillText("Single origin", 150, 300);
            g.fillText("250 g", 150, 340);
            const texture = new THREE.CanvasTexture(art);
            texture.colorSpace = THREE.SRGBColorSpace;
            const label = new THREE.Mesh(
              new THREE.PlaneGeometry(1.1, 1.54),
              new THREE.MeshBasicMaterial({ map: texture }),
            );
            label.position.set(0, -0.1, 0.277);
            const roast = new THREE.Group();
            roast.add(bag, label);
            roast.position.x = 1.75;
            scene.add(roast);
            scene.add(new THREE.AmbientLight("#ffffff", 0.7));
            const key = new THREE.DirectionalLight("#fff1dd", 2.4);
            key.position.set(-3, 4, 5);
            scene.add(key);
            return ({ time }) => {
              const enter = Math.min(1, time / 1.2);
              const ease = 1 - (1 - enter) ** 3;
              roast.scale.setScalar(0.6 + 0.4 * ease);
              roast.rotation.y = (1 - ease) * -Math.PI + Math.sin(time * 0.7) * 0.45;
              roast.rotation.x = Math.sin(time * 0.5) * 0.08;
            };
          }}
        />
      </Track>

      <Track id="text" name="Text" layout="free">
        <Motion
          id="who"
          anchor="talk"
          offset={0.3}
          duration={3}
          sequence={[
            [".bar", { scaleX: [0, 1] }, { duration: 0.45, ease: "easeOut" }],
            [".name", { opacity: [0, 1], x: [-24, 0] }, { at: 0.15, duration: 0.4 }],
            [".role", { opacity: [0, 1], x: [-24, 0] }, { at: 0.3, duration: 0.4 }],
          ]}
        >
          <div
            className="bar"
            style={{
              position: "absolute",
              left: 56,
              top: 400,
              width: 8,
              height: 78,
              background: accent,
              transformOrigin: "left",
            }}
          />
          <div
            className="name"
            style={{
              position: "absolute",
              left: 80,
              top: 398,
              color: "#f4efe6",
              font: "700 38px 'Space Grotesk', sans-serif",
            }}
          >
            {founder}
          </div>
          <div
            className="role"
            style={{ position: "absolute", left: 80, top: 446, color: "#c9c2b8", font: "500 22px Inter, sans-serif" }}
          >
            Head roaster, {product}
          </div>
        </Motion>
        <Motion
          id="monday"
          anchor="talk"
          at="word:8"
          duration={2.6}
          sequence={[[".pill", { opacity: [0, 1], x: [-40, 0] }, { duration: 0.4, ease: "easeOut" }]]}
        >
          <div className="pill" style={{ ...pill, top: 200 }}>
            Roasted every Monday
          </div>
        </Motion>
        <Motion
          id="two-days"
          anchor="close"
          at="word:17"
          duration={2.4}
          sequence={[[".pill", { opacity: [0, 1], x: [-40, 0] }, { duration: 0.4, ease: "easeOut" }]]}
        >
          <div className="pill" style={{ ...pill, top: 200 }}>
            Shipped in two days
          </div>
        </Motion>
        <Motion
          id="to-order"
          anchor="close"
          at="word:21"
          duration={2}
          sequence={[
            [".pill", { opacity: [0, 1], scale: [0.8, 1] }, { duration: 0.35, ease: "easeOut" }],
            [".pill", { backgroundColor: ["rgba(16, 20, 33, 0.82)", accent] }, { at: 0.35, duration: 0.3 }],
          ]}
        >
          <div className="pill" style={{ ...pill, top: 200 }}>
            Brewed to order
          </div>
        </Motion>
      </Track>
    </Composition>
  );
}
