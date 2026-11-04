import { Clip, Composition, Three, Track } from "@cutcraft/kit";

export default function Video() {
  return (
    <Composition fps={30} width={960} height={540}>
      <Track id="main">
        <Clip id="shot" src="asset:aurora" in={0} out={3} fit="cover" />
      </Track>
      <Track id="scene" layout="free">
        {/* Plain three.js in setup; the function it returns runs on every frame with the layer's time. */}
        <Three
          id="cube"
          anchor="shot"
          duration={3}
          camera={{ position: [0, 0, 5], fov: 40 }}
          setup={({ scene, THREE }) => {
            const cube = new THREE.Mesh(new THREE.BoxGeometry(1.6, 1.6, 1.6), new THREE.MeshNormalMaterial());
            scene.add(cube);
            return ({ time }) => {
              cube.rotation.set(time * 0.6, time, 0);
            };
          }}
        />
      </Track>
    </Composition>
  );
}
