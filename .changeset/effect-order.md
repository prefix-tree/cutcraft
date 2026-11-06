---
"@cutcraft/player": minor
---

Breaking: an element's effects now run in the order the file writes them. Before, every shader effect ran before every CSS-type effect (`brightness`, `contrast`, `saturation`, `hue`, `sepia`, `grayscale`, `invert`, `blur`, `shadow`, `temperature`, `tint`, `<ColorGrade>`) on clips, nested sequences and adjustments, and after them on overlays. When an element has a shader effect or a shader transition, its CSS-type effects now run as shader passes in their place, each matching Chrome's own filter within a step or two (blur within a few levels, being the true Gaussian where Chrome approximates). A shader transition no longer applies the incoming clip's CSS effects to the outgoing clip. An element with CSS-type effects only still draws them as one CSS filter.
