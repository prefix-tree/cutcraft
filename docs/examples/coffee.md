---
title: A coffee film
---

<script setup>
import { withBase } from "vitepress";
</script>

# A coffee film

Two ways to a cup, cut from four stock shots: a slow pour-over, then a fast espresso. One file shows most of what a
cut can do: transitions, speed, colour, titles, components, a block and sound.

<div class="cc-pair"><video :src="withBase('/showcase/coffee.webm')" :poster="withBase('/showcase/coffee.jpg')" controls loop playsinline></video></div>

## Key elements

- **Four shader transitions** between the five shots, each a different kind: a film burn, an iris, a pixel dissolve and a
  clock wipe, set as siblings of the clips. ([Transitions](/guide/transitions))
- **A push-in** on the wide pour-over and on the three glasses: two keys on `transform.scale`.
  ([Keys over time](/guide/animation#keys))
- **A speed ramp into slow motion** on the close pour (keys on `speed`), then **one frame held** (`freezes`) while a
  callout points at it. ([Speed ramps](/guide/animation#speed) · [Freeze frames](/guide/animation#freezes))
- **A warm LUT that comes in while you watch**: its `amount` has keys from 0 to 1 halfway through the first
  espresso shot, so the shot is seen before and after. A badge names it as it lands.
  ([`lut`](/reference/effects/lut) · [Colour and grading](/guide/colour))
- **A grade under the closing line**: an `<Adjustment>` with exposure, curves and vibrance, and a dark fall-off from
  the left in a `<Layer>` marked `ground`. ([`<Adjustment>`](/reference/elements/adjustment))
- **A film look over everything**: grain and a vignette on one `<Adjustment>` that runs the whole cut.
  ([`grain`](/reference/effects/grain) · [`vignette`](/reference/effects/vignette))
- **Titles built word by word** in the site's own type, Barlow Condensed and Geist Mono, declared with
  `googleFont()`. ([`<Title>`](/reference/elements/title) · [Fonts](/guide/themes#fonts))
- **A lower third, a callout and a badge**, each one tag. ([Components](/reference/components/))
- **A quote built by a block**: placed with `uberscene blocks add quote-build --into coffee.tsx --track words --at
  close`, then given its words, size and place as props on the tag. ([Blocks](/guide/blocks))
- **A sound cue on each beat**: a whoosh on each transition, a click on the held frame, a pop on the badge, a riser
  into the quote's last word and a chime on the name. Each is anchored to what it sounds for, so it moves when that
  moves. ([Sound effects at a cut](/guide/transitions#sound-effects-at-a-cut))

Everything is anchored to a shot or a transition, so trimming a shot moves its titles, its components and its sounds
with it.

See: [Transitions](/guide/transitions) · [Colour and grading](/guide/colour) · [Blocks](/guide/blocks) ·
[Timing](/guide/time)

## The code

<<< @/../examples/showcase/coffee.tsx

## The footage

Four Pixabay videos, under the Pixabay Content License: the pour-over close
([209419](https://pixabay.com/videos/id-209419/)) and wide ([209424](https://pixabay.com/videos/id-209424/)), the
espresso machine filling three glasses ([46989](https://pixabay.com/videos/id-46989/)), and espresso into a red paper
cup ([251](https://pixabay.com/videos/id-251/)). The maker of the machine in the last shot has nothing to do with this
project. The sound cues are made by the synth in `examples/shorts/media/sounds.ts`.
