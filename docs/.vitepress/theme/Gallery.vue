<!-- The landing page's gallery: the rendered examples as a masonry of posters, each a link to the file that made it.
     A tile plays while hovered or focused (never for a reader who asked for reduced motion), and nothing is fetched
     before that but the poster. -->
<script setup lang="ts">
import { withBase } from "vitepress";

import { data as items } from "../../gallery.data";

const still = typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

function play(event: Event): void {
  if (still) return;
  const video = (event.currentTarget as HTMLElement).querySelector("video");
  video?.play().catch(() => undefined);
}
function stop(event: Event): void {
  const video = (event.currentTarget as HTMLElement).querySelector("video");
  if (!video) return;
  video.pause();
  video.currentTime = 0;
}
</script>

<template>
  <div class="cc-gallery">
    <a v-for="item in items" :key="item.src" class="cc-gallery-tile" :href="withBase(item.link)"
      @mouseenter="play" @focus="play" @mouseleave="stop" @blur="stop">
      <video :src="withBase(`/${item.src}.webm`)" :poster="withBase(`/${item.src}.jpg`)" :style="{ aspectRatio: item.aspect }"
        muted loop playsinline preload="none" aria-hidden="true"></video>
      <span class="cc-gallery-caption">
        <span class="cc-gallery-kind">{{ item.kind }}</span>
        <span class="cc-gallery-title">{{ item.title }}</span>
        <span class="cc-gallery-lines">{{ item.lines }} lines of TSX</span>
      </span>
    </a>
  </div>
</template>
