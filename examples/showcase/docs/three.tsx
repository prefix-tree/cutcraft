import { Clip, Composition, Three, Track } from "@uberscene/kit";

export default function Video() {
  return (
    <Composition fps={30} width={960} height={540}>
      <Track id="main">
        <Clip id="shot" src="asset:espresso" in={8} out={11} fit="cover" />
      </Track>
      <Track id="scene" layout="free">
        {/* Plain three.js in setup; the function it returns runs on every frame with the layer's time. */}
        <Three
          id="bean"
          anchor="shot"
          duration={3}
          camera={{ position: [0, 0, 5], fov: 40 }}
          setup={({ scene, THREE }) => {
            // A roasted bean: a squashed sphere, lit from the upper left, turning in the dark beside the machine.
            const bean = new THREE.Mesh(
              new THREE.SphereGeometry(0.9, 48, 32),
              new THREE.MeshStandardMaterial({ color: "#6b3c22", roughness: 0.45, metalness: 0.05 }),
            );
            // The crease down its flat side: a thin dark tube laid on the surface, in a gentle S.
            const crease = new THREE.Mesh(
              new THREE.TubeGeometry(
                new THREE.CatmullRomCurve3(
                  Array.from({ length: 9 }, (_, i) => {
                    const x = -0.72 + (1.44 * i) / 8;
                    const y = 0.07 * Math.sin(x * 4);
                    return new THREE.Vector3(x, y, Math.sqrt(Math.max(0, 0.81 - x * x - y * y)) - 0.01);
                  }),
                ),
                48,
                0.04,
                8,
              ),
              new THREE.MeshStandardMaterial({ color: "#2a160c", roughness: 0.8 }),
            );
            const roasted = new THREE.Group();
            roasted.add(bean, crease);
            roasted.scale.set(1, 0.7, 0.5);
            roasted.position.x = -2.3;
            scene.add(roasted, new THREE.AmbientLight("#ffffff", 0.5));
            const key = new THREE.DirectionalLight("#ffe9cc", 2.6);
            key.position.set(-3, 3, 4);
            scene.add(key);
            return ({ time }) => {
              roasted.rotation.set(0.4 + Math.sin(time * 0.6) * 0.3, time * 0.9, 0.3);
            };
          }}
        />
      </Track>
    </Composition>
  );
}
