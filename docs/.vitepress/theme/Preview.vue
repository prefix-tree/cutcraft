<!-- A rendered preview: a looping WebM with its poster, played only while on screen so a grid of them stays light. -->
<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from "vue";
import { withBase } from "vitepress";

const props = defineProps<{ src: string; alt?: string; wide?: boolean }>();
const video = ref<HTMLVideoElement | null>(null);
let observer: IntersectionObserver | null = null;

onMounted(() => {
  const v = video.value;
  if (!v) return;
  observer = new IntersectionObserver(([entry]) => {
    if (entry?.isIntersecting) v.play().catch(() => undefined);
    else v.pause();
  }, { rootMargin: "100px" });
  observer.observe(v);
});
onBeforeUnmount(() => observer?.disconnect());
</script>

<template>
  <video ref="video" :class="['cc-preview', { wide: props.wide }]" :src="withBase(`/${props.src}.webm`)" :poster="withBase(`/${props.src}.jpg`)"
    :aria-label="props.alt" muted loop playsinline preload="none"></video>
</template>
