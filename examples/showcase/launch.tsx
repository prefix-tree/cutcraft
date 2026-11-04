import { z } from "zod";

import { Clip, Composition, Motion, Three, Track, Transition } from "@cutcraft/kit";

export const schema = z.object({ product: z.string(), founder: z.string(), accent: z.string() });
export const defaults = { product: "Shed", founder: "Maya Chen", accent: "#e8a33d" };

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
 * A product launch: the founder on camera, a three.js device turning beside them, and each feature called out on the
 * word that names it. Trim the founder's clip and every callout moves with its word.
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

      <Track id="device" name="Device" layout="free">
        {/* The device turns in as the founder says the product's name, and keeps turning to the end. */}
        <Three
          id="phone"
          anchor="talk"
          at="word:1"
          duration={12}
          camera={{ position: [0, 0, 6], fov: 35 }}
          setup={({ scene, THREE }) => {
            const body = new THREE.Mesh(
              new THREE.BoxGeometry(1.5, 3, 0.16),
              new THREE.MeshStandardMaterial({ color: "#1b2a4a", metalness: 0.5, roughness: 0.3 }),
            );
            // The screen: the product's name drawn on a canvas, shown on the front face.
            const art = document.createElement("canvas");
            art.width = 300;
            art.height = 600;
            const g = art.getContext("2d") as CanvasRenderingContext2D;
            const grad = g.createLinearGradient(0, 0, 0, 600);
            grad.addColorStop(0, accent);
            grad.addColorStop(1, "#c8402a");
            g.fillStyle = grad;
            g.fillRect(0, 0, 300, 600);
            g.fillStyle = "#101421";
            g.font = "700 64px 'Space Grotesk', sans-serif";
            g.textAlign = "center";
            g.fillText(product, 150, 320);
            const texture = new THREE.CanvasTexture(art);
            texture.colorSpace = THREE.SRGBColorSpace;
            const screen = new THREE.Mesh(
              new THREE.PlaneGeometry(1.36, 2.8),
              new THREE.MeshBasicMaterial({ map: texture }),
            );
            screen.position.z = 0.082;
            const phone = new THREE.Group();
            phone.add(body, screen);
            phone.position.x = 1.7;
            scene.add(phone);
            scene.add(new THREE.AmbientLight("#ffffff", 0.6));
            const key = new THREE.DirectionalLight("#ffffff", 2.2);
            key.position.set(-3, 4, 5);
            scene.add(key);
            return ({ time }) => {
              const enter = Math.min(1, time / 1.2);
              const ease = 1 - (1 - enter) ** 3;
              phone.scale.setScalar(0.6 + 0.4 * ease);
              phone.rotation.y = (1 - ease) * -Math.PI + Math.sin(time * 0.7) * 0.45;
              phone.rotation.x = Math.sin(time * 0.5) * 0.08;
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
            Founder, {product}
          </div>
        </Motion>
        <Motion
          id="builds"
          anchor="talk"
          at="word:8"
          duration={2.6}
          sequence={[[".pill", { opacity: [0, 1], x: [-40, 0] }, { duration: 0.4, ease: "easeOut" }]]}
        >
          <div className="pill" style={{ ...pill, top: 200 }}>
            Builds from your repo
          </div>
        </Motion>
        <Motion
          id="sandbox"
          anchor="close"
          at="word:17"
          duration={2.4}
          sequence={[[".pill", { opacity: [0, 1], x: [-40, 0] }, { duration: 0.4, ease: "easeOut" }]]}
        >
          <div className="pill" style={{ ...pill, top: 200 }}>
            Every app in a sandbox
          </div>
        </Motion>
        <Motion
          id="zero"
          anchor="close"
          at="word:21"
          duration={2}
          sequence={[
            [".pill", { opacity: [0, 1], scale: [0.8, 1] }, { duration: 0.35, ease: "easeOut" }],
            [".pill", { backgroundColor: ["rgba(16, 20, 33, 0.82)", accent] }, { at: 0.35, duration: 0.3 }],
          ]}
        >
          <div className="pill" style={{ ...pill, top: 200 }}>
            Scales to zero
          </div>
        </Motion>
      </Track>
    </Composition>
  );
}
