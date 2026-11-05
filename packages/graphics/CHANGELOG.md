# @cutcraft/graphics

## 0.2.0

### Minor Changes

- [#13](https://github.com/prefix-tree/cutcraft/pull/13) [`f9ecdb4`](https://github.com/prefix-tree/cutcraft/commit/f9ecdb40e0cd3897fac4ba138b86aab700b9d28f) Thanks [@bsnisar](https://github.com/bsnisar)! - The kit's `holdLayerFrame` lets an engine layer (three.js, Motion) hold a frame until it has drawn it, so an export
  never captures a frame half drawn. `loadVideo` returns the file's `source`, which the export page loads.

- [#14](https://github.com/prefix-tree/cutcraft/pull/14) [`57f969f`](https://github.com/prefix-tree/cutcraft/commit/57f969fe2a316d3c70b76738eaf1eada043b3d7a) Thanks [@bsnisar](https://github.com/bsnisar)! - `<Graphic>` and its kinds are deprecated and will be removed in a later release. The lint warns on each one with the
  new `deprecated-graphic` rule, and `Graphic`, `GRAPHIC_KINDS` and `graphicControls` are marked `@deprecated`. Draw the
  same things with `<Motion>`, `<Three>` or a `<Layer>`; the examples and the brand-spot recipe show how.

- [#7](https://github.com/prefix-tree/cutcraft/pull/7) [`0803ecf`](https://github.com/prefix-tree/cutcraft/commit/0803ecfd09d9e75c61ac504955ef7e9c7e177acd) Thanks [@bsnisar](https://github.com/bsnisar)! - `<Three>` and `<Motion>`: a Layer can hold a three.js scene (through React Three Fiber, or plain three.js in `setup`)
  or a Motion sequence, both on the video's clock, so they scrub both ways. `@cutcraft/graphics/libraries`
  (`installFreeCodeLibraries`), `@cutcraft/graphics/three` and `@cutcraft/graphics/motion` offer them to a cut file's
  free code. The export draws them as the player does. CSS animations inside a `<Layer>` are held at the layer's time:
  they count from the layer's start, pause with the video and scrub both ways.

### Patch Changes

- [#8](https://github.com/prefix-tree/cutcraft/pull/8) [`80a5673`](https://github.com/prefix-tree/cutcraft/commit/80a5673db211290f52e058630664af27b2327c6e) Thanks [@bsnisar](https://github.com/bsnisar)! - The `comparison` graphic's example labels its second bar "With CutCraft".

- [#8](https://github.com/prefix-tree/cutcraft/pull/8) [`80a5673`](https://github.com/prefix-tree/cutcraft/commit/80a5673db211290f52e058630664af27b2327c6e) Thanks [@bsnisar](https://github.com/bsnisar)! - Every package has a README written for its users, with links to the documentation site that work on npm.
  The graphics README leads with three.js and Motion, its deprecated `<Graphic>` kinds below.
- Updated dependencies [[`f9ecdb4`](https://github.com/prefix-tree/cutcraft/commit/f9ecdb40e0cd3897fac4ba138b86aab700b9d28f), [`a7965d3`](https://github.com/prefix-tree/cutcraft/commit/a7965d3b766a4570026d7cde47f5e6525895dc3a), [`57f969f`](https://github.com/prefix-tree/cutcraft/commit/57f969fe2a316d3c70b76738eaf1eada043b3d7a), [`83664f3`](https://github.com/prefix-tree/cutcraft/commit/83664f327df1e106685132199f2d0506b42609ad), [`7130e8c`](https://github.com/prefix-tree/cutcraft/commit/7130e8cf75b2c8e026f3e8950400f8106adbe98c), [`f5cd9c7`](https://github.com/prefix-tree/cutcraft/commit/f5cd9c7b7dd1433bb1eff2e2346594baacc9d01e), [`0a6b41a`](https://github.com/prefix-tree/cutcraft/commit/0a6b41a6703b784288cadfbbb3e963d3b9723c22), [`0803ecf`](https://github.com/prefix-tree/cutcraft/commit/0803ecfd09d9e75c61ac504955ef7e9c7e177acd), [`47b40b0`](https://github.com/prefix-tree/cutcraft/commit/47b40b0fc69a3c338ef44c252bcc193fc505abad), [`80a5673`](https://github.com/prefix-tree/cutcraft/commit/80a5673db211290f52e058630664af27b2327c6e)]:
  - @cutcraft/kit@0.2.0
