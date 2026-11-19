---
editLink: false
---

# `ProgressBar`

A bar that fills from the left to its value.

<Example src="previews/components/progress-bar" alt="ProgressBar">

<<< @/../examples/showcase/components/progress-bar.tsx

</Example>

The coffee footage is Pixabay videos [209419](https://pixabay.com/videos/id-209419/), [209424](https://pixabay.com/videos/id-209424/), [46989](https://pixabay.com/videos/id-46989/) and [251](https://pixabay.com/videos/id-251/), under the Pixabay Content License. The maker of the machine in the red cup shot has nothing to do with this project.

## Props

Besides the timing props (`start`, `anchor`, `at`, `offset`, `duration`):

| param | type | default | description |
|---|---|---|---|
| `id` | string |  | The component's id; each of its parts' ids starts with it. |
| `value` | number (0..1) | `1` | How full it ends, 0 to 1. |
| `x` | number | `0` | The bar's centre, in pixels from the frame's centre. |
| `y` | number | `440` | The bar's centre, in pixels below the frame's centre. |
| `width` | number (> 0) | `1200` | The full bar's length in pixels. |
| `height` | number (> 0) | `14` | The bar's thickness in pixels; its ends are rounded. |
| `color` | string | `"$primary"` | The fill's colour; the track under it is a faint `$muted`. |
| `fillFor` | number (> 0) | `1.2` | Seconds it takes to fill. |

[All components](/reference/components/)
