---
"@cutcraft/kit": minor
---

A faster `outline` and `zoomBlur`, and a `glow` that keeps its element's colours.

- `outline` measures the exact distance to the silhouette in a pass down each column and one along each row: about 34 reads per pixel at the default width instead of 288. Its corners round as a circle's, and its outer edge fades over one pixel.
- `zoomBlur` takes one sample per pixel of each pixel's streak, at least 2 and at most `samples`.
- `glow` is a halo under its element, which keeps its own colours inside; it used to add its light on top, washing a white glow on white text to a flat blob. With a `threshold` it also blooms over the bright parts, as before on footage.
- In the export without a GPU, outline and glow on footage go from 0.3 to 3.0 fps, and a zoom blur from 2.8 to 3.5.
