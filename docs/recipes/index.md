# Recipes

Complete cut files for the videos cutcut is made for. Each is a file a model
could have written from a brief: it passes the lint with no warnings, resolves
with no errors, and a test in `recipes/test` pins what it places. Read them
as the prompt's conventions in use; copy them as starting points.

| Recipe | What it shows |
|---|---|
| [Talking-head cut](./talking-head) | A podcast answer cut to its sentences, with the flubbed take dropped, generated captions, a title and a ducked music bed. |
| [Product demo with zoom-ins](./product-demo) | A screen recording with a crop that zooms into the first click and back, a highlight ring on every click, a narrated voice-over with generated captions. |
| [Vertical clip from a podcast](./vertical-podcast) | A 9:16 cut of a landscape podcast: one clip per sentence with a crop on whoever speaks, a name tag on each speaker change, short karaoke captions. |
| [Slideshow with motion](./slideshow) | Four photos held four seconds each with a slow push, crossfades between them, a bed that fades out with the last one. |
| [Stats with handles](./stats) | Two numbers count up over product footage. Each counter is one component inside a Layer, so its value and label are handles. |
| [Variants from one file](./variants) | One cut rendered for many brands or markets: copy, colour and logo are schema props, and a variant is `defaults` with overrides. |
| [Brand spot in any theme](./brand-spot) | A spot built from graphics around a screen recording, with a backdrop beneath it; one prop swaps the theme and with it every colour, font and entrance. |
| [Multicam highlights](./highlights) | Two cameras of one scene switched at camera B's shot boundaries, with the dense segment picked by the transcript's silences. |

The fixture manifest they share is `recipes/manifest.json`: a two-speaker
podcast with punctuation, silences and shots, a narrated voice track, a screen
recording, product footage with shots, two camera angles, four photos, a
music bed and a logo.
