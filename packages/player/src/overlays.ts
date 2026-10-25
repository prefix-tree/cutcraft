/**
 * What the overlay elements (titles, shapes, SVG, stickers, layers, captions)
 * draw, as plain React trees plus their layout, with no hooks and no DOM. The
 * browser mounts them in `DomLayer`; the Node renderer rasterises them.
 */
export { OVERLAY_KINDS, clipPathCss, overlayLayout, type ElementProps, type OverlayLayout } from "./overlays/layout";
export { motionAt, type ClipRect, type GraphicAnimation, type Motion } from "./model/motion";
export { captionsContent, layerContent, stickerPlaceholder, stickerSize, titleContent } from "./overlays/content";
export { shapeDrawing, shapeMarkup, shapeSize, type ShapeDrawing, type ShapeMarkup } from "./overlays/shape";
export { indexLayerInteriors } from "./overlays/layer-interiors";
export { layerClock } from "./model/time";
export { parseSvg, prepareSvg, rgb, serialize, svgIntrinsicSize, type PrepareSvgOptions, type PreparedSvg, type SvgColor, type SvgNode, type SvgViewBox } from "./overlays/svg";
export { svgDrawing, themeTokens, type SvgDrawing } from "./overlays/svg-element";
export { graphicDrawing, graphicLabels, iconStickerDrawing, type GraphicDrawing } from "./overlays/graphic";
