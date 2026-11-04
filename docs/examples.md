---
title: Examples
---

<script setup>
import { withBase } from "vitepress";
</script>

# Examples

Each video is one file in [`examples/showcase`](https://github.com/prefix-tree/cutcraft/tree/main/examples/showcase), rendered by
the export engine with `pnpm --filter @cutcraft/example-showcase render`. The footage is made by `ffmpeg`'s own
sources (`pnpm --filter @cutcraft/example-showcase gen`), so you can render them all yourself; the files with three.js
or Motion render through the [browser engine](/guide/exporting#three-js-and-motion-the-browser-engine). The people on
camera are stand-ins: their footage is a gradient, and the manifest holds the words they would say.

## A product launch

The founder on camera, cut on her words, with b-roll in the middle. A `<Three>` layer turns a phone in on the word
"Shed" and keeps it turning; its screen is the product's name drawn on a canvas. A Motion lower third names her, and
each feature appears as a pill on the word that names it (`anchor="talk" at="word:8"`), so recutting the talk retimes
every callout.

<div class="cc-pair"><video :src="withBase('/showcase/launch.webm')" :poster="withBase('/showcase/launch.jpg')" controls muted loop playsinline></video></div>

<<< ../examples/showcase/launch.tsx

## Kinetic type

A vertical short. Each phrase is a `<Motion>` sequence anchored to the word that starts it: one slams in, one stacks
word by word, one slides across. Karaoke captions run underneath.

<div class="cc-pair"><video class="tall" :src="withBase('/showcase/kinetic.webm')" :poster="withBase('/showcase/kinetic.jpg')" controls muted loop playsinline></video></div>

<<< ../examples/showcase/kinetic.tsx

## A data story

A chart written as plain SVG and animated by Motion: each bar grows on the word that says its number. The counters
are a few lines of React in a `<Layer>`, counting up on the layer's clock.

<div class="cc-pair"><video :src="withBase('/showcase/data.webm')" :poster="withBase('/showcase/data.jpg')" controls muted loop playsinline></video></div>

<<< ../examples/showcase/data.tsx

## A logo reveal

Three thousand three.js particles, scattered by a seeded random, settle into the name sampled from a canvas, then a
Motion tagline slides in under it. Every particle's place is a function of time, so a frame looks the same however
it is reached.

<div class="cc-pair"><video :src="withBase('/showcase/logo.webm')" :poster="withBase('/showcase/logo.jpg')" controls muted loop playsinline></video></div>

<<< ../examples/showcase/logo.tsx

## An edit

Three shots cut back to back on a sequence track: a wipe and a slide sit between them as siblings, the middle shot
pushes in with four keyframes, a title builds word by word, and a Motion lower third comes in over the second shot. The
overlays anchor to the shots, so they move when a cut moves.

<div class="cc-pair"><video :src="withBase('/showcase/edit.webm')" :poster="withBase('/showcase/edit.jpg')" controls muted loop playsinline></video></div>

<<< ../examples/showcase/edit.tsx

## Captions and key points

A vertical short. The captions are generated from the words the clip plays and highlight word by word; the key point
is anchored to the clip and timed to the word that names it (`at="word:16"`), so trimming the clip keeps it on that
word.

<div class="cc-pair"><video class="tall" :src="withBase('/showcase/captions.webm')" :poster="withBase('/showcase/captions.jpg')" controls muted loop playsinline></video></div>

<<< ../examples/showcase/captions.tsx
