<!-- The landing page's large video: autoplays muted and looping, unless the reader asked for reduced motion, who gets
     its poster and a play button instead. -->
<script setup lang="ts">
import { onMounted, ref } from "vue";
import { withBase } from "vitepress";

const props = defineProps<{ src: string; alt: string }>();
const video = ref<HTMLVideoElement | null>(null);
const still = ref(false);

onMounted(() => {
  const v = video.value;
  if (!v) return;
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    still.value = true;
    return;
  }
  v.play().catch(() => (still.value = true));
});

function play(): void {
  still.value = false;
  video.value?.play().catch(() => undefined);
}
</script>

<template>
  <div class="cc-hero-video">
    <video ref="video" :src="withBase(`/${props.src}.webm`)" :poster="withBase(`/${props.src}.jpg`)"
      :aria-label="props.alt" muted loop playsinline preload="auto"></video>
    <button v-if="still" type="button" class="cc-hero-play" aria-label="Play the video" @click="play">▶</button>
  </div>
</template>
