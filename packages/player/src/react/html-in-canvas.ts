/** Whether this browser draws live DOM into a canvas (HTML-in-Canvas: Chrome with the CanvasDrawElement feature). */
export function htmlInCanvas(): boolean {
  return (
    typeof CanvasRenderingContext2D !== "undefined" &&
    typeof (CanvasRenderingContext2D.prototype as { drawElementImage?: unknown }).drawElementImage === "function"
  );
}
