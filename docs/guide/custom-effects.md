# Your own effects and transitions

The built-in [effects and transitions](/reference/effects/) cover the usual looks. When you need another, write it in
GLSL in the file itself: declare it at the top with `effect()` or `transition()`, and pass what it returns as an
`<Effect>` or `<Transition>` type.

<Example src="previews/guide/shader-effect" alt="Fractal footage turned navy and gold by a duotone effect">

<<< @/../examples/showcase/guide/shader-effect.tsx

</Example>

## Declare an effect

An effect is a name, a zod schema of its params, and a shader. The example above is a two-colour tone (the built-in
`duotone` does the same; this shows how it is written), with two colour params and a third that the keyframes animate
from the plain footage to the full effect. TypeScript checks the params you write on `<Effect>` against the schema you
declared, as it does for the built-in types.

An effect's shader defines `vec4 effect(vec2 uv)` and returns the colour at `uv`. It gets:

| Name | Is |
|---|---|
| `image` | The element's picture. |
| `params.<name>` | Each param, typed from the schema ([Params](#params)). |
| `resolution` | The frame in pixels. |
| `time` | Seconds into the element. |

`uv` (0, 0) is the top left. Return plain colour; the player premultiplies it.

### Keep declarations at the top

Keep `effect()` and `transition()` at the top of the file with a literal `name` and `shader` (or `passes`), where the
editor and lint can read them; the `declaration` lint ([Lint](/guide/editing#lint)) says when one is not.

The player finds an effect on the element that uses it, and among the file's exports, so `export const` the ones the
editor should offer before anything uses them. The editor's [actions](/reference/actions) take the names too, for
example `effect/add` and `transition/update`, and write `type={glitch}` back into the file.

::: details A declaration is a value, not a registration
Each file's effects belong to it alone, so many players on one page never see each other's.
:::

## Params

The shader reads each param as `params.<name>`, so a param can take any name, `length` and `image` included. The types
come from the schema, once:

| Schema | In the shader |
|---|---|
| A number | `float` |
| A boolean | `bool` |
| An array of two, three or four numbers | `vec2`, `vec3`, `vec4` |
| A colour string such as `"#ff8800"` | `vec3` |
| A `z.enum` | `int`, and the shader names its options: `params.direction == params.direction.left` |
| `"asset:ID"` | A texture: an image as a `sampler2D`, a LUT (`.cube`) as a `sampler3D` |

`effect()` refuses a shader that reads a param its schema does not declare, or one no uniform can carry.

The schema does the rest of the work too:

- the zod schema checks the values and fills in defaults;
- a [`<Keyframe>`](/reference/elements/keyframe) inside the `<Effect>` animates one with `param="<name>"`, and the
  resolver checks the name and the values against the schema;
- an editor can build its inspector from the schema.

### A texture from an asset

A param that names an asset, `"asset:ID"`, is read by the shader as a texture. The player loads it before the frame
that needs it, and the resolver checks that the asset is in the manifest and is an image or a LUT. The built-in `lut`
effect reads a LUT this way: see [Colour and grading](./colour#a-look-from-a-lut).

::: warning Textures and overlays
Textures reach effects on clips, nested sequences and adjustments. On an overlay, an effect with an asset param is not
drawn yet.
:::

## Several passes

An effect that needs more than one pass (a blur in two directions, a glow drawn from a blurred copy) gives `passes`, a
list of shaders, in place of `shader`. Each defines `vec4 effect(vec2 uv)`, and they run in order:

| Name | In each pass |
|---|---|
| `image` | The pass before's result (the element's picture for the first). |
| `original` | The element's picture, in every pass. |
| `params` | The same params in every pass. |

A separable Gaussian blur, as an example, with `radius` its standard deviation in pixels as CSS `blur()` reads it (25
taps out to three deviations):

```tsx
const soften = effect({
  name: "soften",
  params: z.object({ radius: z.number().min(0).max(40).default(4) }),
  passes: [
    `vec4 effect(vec2 uv) {
      float s = max(params.radius, 0.001);
      vec4 sum = vec4(0.0);
      float total = 0.0;
      for (int i = -12; i <= 12; i++) {
        float d = float(i) * s / 4.0;
        float w = exp(-d * d / (2.0 * s * s));
        sum += w * texture(image, uv + vec2(d / resolution.x, 0.0));
        total += w;
      }
      return sum / total;
    }`,
    `vec4 effect(vec2 uv) {
      float s = max(params.radius, 0.001);
      vec4 sum = vec4(0.0);
      float total = 0.0;
      for (int i = -12; i <= 12; i++) {
        float d = float(i) * s / 4.0;
        float w = exp(-d * d / (2.0 * s * s));
        sum += w * texture(image, uv + vec2(0.0, d / resolution.y));
        total += w;
      }
      return sum / total;
    }`,
  ],
});
```

## Declare a transition

A transition is declared the same way with `transition()`. Here the incoming clip opens as a circle from the centre:

<Example src="previews/guide/shader-transition" alt="A circle of the next clip opening over the first">

<<< @/../examples/showcase/guide/shader-transition.tsx

</Example>

Its shader defines `vec4 transition(vec2 uv)` and gets:

| Name | Is |
|---|---|
| `from` | The outgoing picture. |
| `to` | The incoming picture. |
| `progress` | How far it has got, from 0 to 1. |
| `params.<name>`, `resolution`, `time` | As for an effect. |

## Effects on titles and layers

Overlays take the same effects: titles, shapes, SVG, stickers and any `<Layer>`, including `<Three>` and `<Motion>`.
Write the `<Effect>` inside the element, next to its text or its free code. Here one colour-split effect runs on a
title and, more gently, on a Motion badge, while the footage under them stays as it is:

<Example src="previews/guide/title-effect" alt="A white title and an orange badge with red and blue fringes over fractal footage">

<<< @/../examples/showcase/guide/title-effect.tsx

</Example>

An overlay is DOM, so the player draws it into a canvas with HTML-in-Canvas and runs its effects over that picture,
in file order.

::: warning Overlay effects in the preview
HTML-in-Canvas is a Chrome feature that is still behind a flag: turn on `chrome://flags/#canvas-draw-element` to see
overlay effects in the preview. Without it the preview draws the overlay's built-in effects as CSS, leaves out the
ones only a shader draws, and warns once. The export always draws them all, because its browser has the feature on.
:::

## How effects are drawn

An element's effects run in the order they appear in the file, yours and the built-in ones alike, after its mask,
vignette and grain. Here the same two effects in the opposite order give two different pictures:

<Example src="previews/guide/effect-order" alt="The same shot twice: toned navy and amber on the left, grey on the right">

<<< @/../examples/showcase/guide/effect-order.tsx

</Example>

| On | Effects run |
|---|---|
| `<Clip>`, `<Nested>` | After its mask, vignette and grain. |
| `<Adjustment>` | Over everything beneath it, its vignette and grain included. |
| An overlay | In order, but an overlay does not draw vignette or grain yet: the lint says so. |
| Each clip under a shader transition | Before the two are blended. |

The player draws these shaders with WebGL in any browser, and the export draws them the same way, in the
[Chrome it runs in](/guide/exporting#the-browser-it-runs-in).

::: details Shaders, CSS filters and passes
Most built-in effects run as shaders, through the same pipeline as yours: the colour tools in
[Colour and grading](./colour), the footage tools, and the title looks, and so do the built-in shader transitions
([Transitions](./transitions)). The simple adjustments (brightness, blur and the like) are CSS filters, and vignette
and grain are painted.

When none of an element's effects needs a shader, its built-in ones draw as one CSS filter. Once one does, they all
run as shader passes, so the order stays the one you wrote.

Consecutive built-in colour effects (exposure, white balance, curves, a LUT, brightness and the like) are drawn
together as one pass, still in that order. A built-in whose params change nothing (an amount at 0) is not drawn at
all.
:::

## Next

- [Effects and transitions](/reference/effects/): every built-in, with its params.
- [Colour and grading](./colour): the built-in colour tools and LUTs.
- [Transitions](./transitions): the built-in transitions and what goes over a cut.
- [Free code](./free-code): draw anything in a layer.
