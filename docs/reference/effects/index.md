# Effects and transitions

Every built-in `<Effect type>` and `<Transition type>`. Hover a card to play it; each page shows the file that made the video and the params it takes. Params outside their ranges, or not listed, are an error when the file resolves; a keyframe inside an effect animates one by `param`. Generated from the effect registry (`packages/kit/src/effects/registry.ts`) by `pnpm docs:gen`.

## Effects

### Basic adjustments

<div class="cc-cards">
<PreviewCard code hover title="brightness" link="/reference/effects/brightness" src="previews/effects/brightness" text="Lightens or darkens the picture." />
<PreviewCard code hover title="contrast" link="/reference/effects/contrast" src="previews/effects/contrast" text="Pushes lights and darks apart, or pulls them together." />
<PreviewCard code hover title="saturation" link="/reference/effects/saturation" src="previews/effects/saturation" text="Makes colours richer or greyer." />
<PreviewCard code hover title="hue" link="/reference/effects/hue" src="previews/effects/hue" text="Turns every colour around the colour wheel." />
<PreviewCard code hover title="grayscale" link="/reference/effects/grayscale" src="previews/effects/grayscale" text="Takes the colour out." />
<PreviewCard code hover title="sepia" link="/reference/effects/sepia" src="previews/effects/sepia" text="Tones the picture brown, like an old print." />
<PreviewCard code hover title="invert" link="/reference/effects/invert" src="previews/effects/invert" text="Turns the picture into its negative." />
<PreviewCard code hover title="blur" link="/reference/effects/blur" src="previews/effects/blur" text="Softens the picture; the radius is the Gaussian's standard deviation, in pixels." />
<PreviewCard code hover title="shadow" link="/reference/effects/shadow" src="previews/effects/shadow" text="Casts a soft drop shadow behind the element's own shape." />
</div>

### Vignette and grain

<div class="cc-cards">
<PreviewCard code hover title="vignette" link="/reference/effects/vignette" src="previews/effects/vignette" text="Darkens the edges of the frame." />
<PreviewCard code hover title="grain" link="/reference/effects/grain" src="previews/effects/grain" text="Adds moving film grain." />
</div>

### Colour

<div class="cc-cards">
<PreviewCard code hover title="levels" link="/reference/effects/levels" src="previews/effects/levels" text="Sets the black point, the white point and the gamma between them." />
<PreviewCard code hover title="lut" link="/reference/effects/lut" src="previews/effects/lut" text="Grades through a 3D lookup table from a .cube file." />
<PreviewCard code hover title="exposure" link="/reference/effects/exposure" src="previews/effects/exposure" text="Brightens or darkens in stops, as a camera would." />
<PreviewCard code hover title="vibrance" link="/reference/effects/vibrance" src="previews/effects/vibrance" text="Lifts the muted colours more than the strong ones." />
<PreviewCard code hover title="whiteBalance" link="/reference/effects/whiteBalance" src="previews/effects/whiteBalance" text="Warms or cools the picture, and tints it toward green or magenta." />
<PreviewCard code hover title="shadowsHighlights" link="/reference/effects/shadowsHighlights" src="previews/effects/shadowsHighlights" text="Opens up the shadows or holds back the highlights." />
<PreviewCard code hover title="duotone" link="/reference/effects/duotone" src="previews/effects/duotone" text="Maps the picture's brightness onto two colours." />
<PreviewCard code hover title="curves" link="/reference/effects/curves" src="previews/effects/curves" text="Reshapes the tones through curves, for all channels or each one." />
</div>

### Footage

<div class="cc-cards">
<PreviewCard code hover title="colorKey" link="/reference/effects/colorKey" src="previews/effects/colorKey" text="Makes one colour transparent: a green screen." />
<PreviewCard code hover title="regionBlur" link="/reference/effects/regionBlur" src="previews/effects/regionBlur" text="Blurs a box of the frame, to hide a face, a person, a plate or a screen." />
<PreviewCard code hover title="cornerPin" link="/reference/effects/cornerPin" src="previews/effects/cornerPin" text="Moves the picture's four corners, to place it in a screen or a frame." />
<PreviewCard code hover title="zoomBlur" link="/reference/effects/zoomBlur" src="previews/effects/zoomBlur" text="Streaks the picture out from a centre." />
<PreviewCard code hover title="chromaticAberration" link="/reference/effects/chromaticAberration" src="previews/effects/chromaticAberration" text="Splits red and blue apart, as a cheap lens does." />
</div>

### Titles and shapes

<div class="cc-cards">
<PreviewCard code hover title="glow" link="/reference/effects/glow" src="previews/effects/glow" text="Lights a halo around the bright parts." />
<PreviewCard code hover title="outline" link="/reference/effects/outline" src="previews/effects/outline" text="Draws a line around the element's shape." />
<PreviewCard code hover title="longShadow" link="/reference/effects/longShadow" src="previews/effects/longShadow" text="Extrudes a long, hard shadow from the element's shape." />
<PreviewCard code hover title="bevel" link="/reference/effects/bevel" src="previews/effects/bevel" text="Gives the element's shape a raised, lit edge." />
</div>

## Transitions

### Fades, wipes and slides

<div class="cc-cards">
<PreviewCard code hover title="crossfade" link="/reference/transitions/crossfade" src="previews/transitions/crossfade" text="Fades one clip into the next." />
<PreviewCard code hover title="dipToBlack" link="/reference/transitions/dipToBlack" src="previews/transitions/dipToBlack" text="Fades out to black, then in to the next clip." />
<PreviewCard code hover title="dipToWhite" link="/reference/transitions/dipToWhite" src="previews/transitions/dipToWhite" text="Fades out to white, then in to the next clip." />
<PreviewCard code hover title="wipe" link="/reference/transitions/wipe" src="previews/transitions/wipe" text="Wipes the next clip over the first, edge first." />
<PreviewCard code hover title="slide" link="/reference/transitions/slide" src="previews/transitions/slide" text="Slides the next clip in over the first." />
<PreviewCard code hover title="push" link="/reference/transitions/push" src="previews/transitions/push" text="Pushes the first clip out as the next comes in." />
</div>

### Shaders

<div class="cc-cards">
<PreviewCard code hover title="iris" link="/reference/transitions/iris" src="previews/transitions/iris" text="Opens the next clip through a growing circle, polygon or star." />
<PreviewCard code hover title="clockWipe" link="/reference/transitions/clockWipe" src="previews/transitions/clockWipe" text="Sweeps the next clip in around a centre, like a clock hand." />
<PreviewCard code hover title="blinds" link="/reference/transitions/blinds" src="previews/transitions/blinds" text="Opens the next clip through turning slats." />
<PreviewCard code hover title="filmBurn" link="/reference/transitions/filmBurn" src="previews/transitions/filmBurn" text="Burns through the film into the next clip." />
<PreviewCard code hover title="pixelDissolve" link="/reference/transitions/pixelDissolve" src="previews/transitions/pixelDissolve" text="Dissolves into the next clip square by square." />
<PreviewCard code hover title="zoom" link="/reference/transitions/zoom" src="previews/transitions/zoom" text="Zooms through the first clip into the next, with a blur." />
</div>

## Units

A param's name says what kind of value it is, and each kind has one scale:

| Kind | Scale | Params |
|---|---|---|
| strength, mix or share | a fraction, 0 to 1, or -1 to 1 when it goes both ways | `amount`, `opacity`, `softness`, `tolerance`, `tint`, `temperature`, `shadows`, `highlights`, `threshold`, `spill`, `black`, `white`, `blur`, `roundness`, `star` |
| gain | a multiplier | `intensity`, `scale` |
| exponent | a power, 1 changes nothing | `gamma` |
| distance | pixels of the composition; a blur's `radius` (and `bevel`'s `size`) is its Gaussian's standard deviation, as CSS `blur()` reads it | `radius`, `width`, `feather`, `length`, `distance`, `size`, `edge`, `x`, `y` |
| angle | degrees, clockwise from up | `angle`, `rotation`, `startAngle` |
| position | fractions of the frame, `[x, y]` from the top left | `center`, `box`, the corners |
| colour | `"#rgb"` or `"#rrggbb"` | `color`, `dark`, `light` |
| exposure | stops | `stops` |
| duration | seconds | `holdDuration` |
| count | a whole number | `sides`, `slats`, `columns`, `rows`, `samples` |
| seed | a whole number; the same seed draws the same pattern | `seed` |
| switch | `true` or `false` | `fade`, `inverted`, `outlineOnly`, `pushOut`, `radial` |
| curve | `[input, output]` points, 0 to 1 | `rgb`, `red`, `green`, `blue` |
| asset | `"asset:<id>"` from the manifest | `src` |
| choice | a string | `direction`, `curve` |

<script setup>
import { onMounted } from "vue";
import { withBase } from "vitepress";
const PAGES = {"brightness":"effects/brightness","contrast":"effects/contrast","saturation":"effects/saturation","hue":"effects/hue","blur":"effects/blur","vignette":"effects/vignette","grain":"effects/grain","shadow":"effects/shadow","grayscale":"effects/grayscale","sepia":"effects/sepia","invert":"effects/invert","levels":"effects/levels","lut":"effects/lut","exposure":"effects/exposure","vibrance":"effects/vibrance","whitebalance":"effects/whiteBalance","shadowshighlights":"effects/shadowsHighlights","duotone":"effects/duotone","curves":"effects/curves","colorkey":"effects/colorKey","regionblur":"effects/regionBlur","cornerpin":"effects/cornerPin","zoomblur":"effects/zoomBlur","chromaticaberration":"effects/chromaticAberration","glow":"effects/glow","outline":"effects/outline","longshadow":"effects/longShadow","bevel":"effects/bevel","crossfade":"transitions/crossfade","diptoblack":"transitions/dipToBlack","diptowhite":"transitions/dipToWhite","wipe":"transitions/wipe","slide":"transitions/slide","push":"transitions/push","iris":"transitions/iris","clockwipe":"transitions/clockWipe","blinds":"transitions/blinds","filmburn":"transitions/filmBurn","pixeldissolve":"transitions/pixelDissolve","zoom":"transitions/zoom"};
onMounted(() => {
  const page = PAGES[location.hash.slice(1).toLowerCase()];
  if (page) location.replace(withBase("/reference/" + page));
});
</script>
