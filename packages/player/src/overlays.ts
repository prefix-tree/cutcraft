/**
 * What the overlay elements (titles, shapes, SVG, stickers, layers, captions)
 * draw, as plain React trees plus their layout, with no hooks and no DOM. The
 * browser mounts them in `DomLayer`; the Node renderer rasterises them.
 */

export { type ClipRect, type GraphicAnimation, type Motion, motionAt } from "./model/motion";
export { layerClock } from "./model/time";
export {
  captionsContent,
  layerContent,
  stickerPlaceholder,
  stickerSize,
  titleBox,
  titleContent,
} from "./overlays/content";
export { type GraphicDrawing, graphicDrawing, graphicLabels, iconStickerDrawing } from "./overlays/graphic";
export { indexLayerInteriors } from "./overlays/layer-interiors";
export { clipPathCss, type ElementProps, OVERLAY_KINDS, type OverlayLayout, overlayLayout } from "./overlays/layout";
export { type ShapeDrawing, type ShapeMarkup, shapeDrawing, shapeMarkup, shapeSize } from "./overlays/shape";
export { clock, freezeSmil, hasSmil, interpolate } from "./overlays/smil";
export {
  type PreparedSvg,
  type PrepareSvgOptions,
  parseSvg,
  prepareSvg,
  rgb,
  type SvgColor,
  type SvgNode,
  type SvgViewBox,
  serialize,
  svgAnimated,
  svgIntrinsicSize,
} from "./overlays/svg";
export { type SvgDrawing, svgDrawing, themeTokens } from "./overlays/svg-element";
