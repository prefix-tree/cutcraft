import * as fiber from "@react-three/fiber";
import * as motion from "motion";
import * as motionReact from "motion/react";
import * as three from "three";

import { installLayerEngine, type LayerEngine } from "@cutcraft/kit";

import * as cutMotion from "./motion";
import * as cutThree from "./three";

/**
 * The libraries free code in a `<Layer>` may import, by import name. A host passes them to `loadModule`:
 *
 * ```ts
 * loadModule(source, { imports: FREE_CODE_LIBRARIES });
 * ```
 *
 * three.js comes with React Three Fiber and `@cutcraft/graphics/three`, whose `<ThreeScene>` puts a scene on the
 * video's clock; Motion with `@cutcraft/graphics/motion`, whose `useTimeline` and `useLayerTime` do the same for
 * animations. A host that wants fewer builds its own map from these entries.
 */
export const FREE_CODE_LIBRARIES: Readonly<Record<string, unknown>> = {
  three,
  "@react-three/fiber": fiber,
  motion,
  "motion/react": motionReact,
  "@cutcraft/graphics/three": cutThree,
  "@cutcraft/graphics/motion": cutMotion,
};

/**
 * Make `<Three>` and `<Motion>` draw (installs their layer engines) and return the imports a host passes to
 * `loadModule`. Call it once, before the Player mounts:
 *
 * ```ts
 * const imports = installFreeCodeLibraries();
 * const video = loadModule(source, { imports });
 * ```
 */
export function installFreeCodeLibraries(): Readonly<Record<string, unknown>> {
  installLayerEngine("three", cutThree.ThreeLayer as LayerEngine);
  installLayerEngine("motion", cutMotion.MotionLayer as LayerEngine);
  return FREE_CODE_LIBRARIES;
}

export { MotionLayer, useLayerTime, useTimeline } from "./motion";
export {
  type ThreeCamera,
  type ThreeFrame,
  ThreeLayer,
  ThreeScene,
  type ThreeSceneProps,
  type ThreeSetup,
  type ThreeSetupFn,
  type ThreeUpdate,
} from "./three";
