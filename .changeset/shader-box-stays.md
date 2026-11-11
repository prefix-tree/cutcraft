---
"@cutcraft/player": patch
---

An overlay with a shader effect keeps its place in the page while that effect is at a value that changes nothing. Before, the overlay's content was made anew at the first frame the effect did something: a `<Three>` scene was set up a second time in the middle of the video, and the export captured that frame before the new scene had drawn, so the scene was missing from one frame. The box that runs an overlay's shaders now also waits for a three.js canvas inside it to draw before it takes the picture. A canvas inside the box is also given one more paint before the picture is taken: a contact sheet, which asks for frames out of order, showed a three.js scene under an effect as it was at the frame asked for before.
