/**
 * What the overlay elements (titles, shapes, SVG, stickers, layers, captions)
 * draw, as plain React trees plus their layout, with no hooks and no DOM. The
 * browser mounts them in `DomLayer`; the Node renderer rasterises them.
 */
export { OVERLAY_KINDS, overlayLayout, type ElementProps, type OverlayLayout } from "./overlays/layout";
export { captionsContent, layerContent, shapeContent, shapeSize, stickerPlaceholder, stickerSize, titleContent } from "./overlays/content";
export { indexLayerInteriors } from "./overlays/layer-interiors";
export { layerClock } from "./model/time";
