<!-- A rendered preview: a looping WebM with its poster, played only while on screen so a grid of them stays light. With
     `hover`, it plays only while the card around it is hovered or focused, so a gallery of many stays still. -->
<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from "vue";
import { withBase } from "vitepress";

const props = defineProps<{ src: string; alt?: string; wide?: boolean; hover?: boolean }>();
const video = ref<HTMLVideoElement | null>(null);
let observer: IntersectionObserver | null = null;
let unlisten: (() => void) | null = null;

onMounted(() => {
  const v = video.value;
  if (!v) return;
  if (props.hover) {
    const card = v.closest(".cc-card") ?? v;
    const play = () => {
      v.preload = "auto";
      v.play().catch(() => undefined);
    };
    const stop = () => {
      v.pause();
      v.currentTime = 0;
    };
    const events = [["mouseenter", play], ["focusin", play], ["mouseleave", stop], ["focusout", stop]] as const;
    for (const [name, handler] of events) card.addEventListener(name, handler);
    unlisten = () => {
      for (const [name, handler] of events) card.removeEventListener(name, handler);
    };
    return;
  }
  observer = new IntersectionObserver(([entry]) => {
    if (entry?.isIntersecting) v.play().catch(() => undefined);
    else v.pause();
  }, { rootMargin: "100px" });
  observer.observe(v);
});
onBeforeUnmount(() => {
  observer?.disconnect();
  unlisten?.();
});
</script>

<template>
  <video ref="video" :class="['cc-preview', { wide: props.wide }]" :src="withBase(`/${props.src}.webm`)" :poster="withBase(`/${props.src}.jpg`)"
    :aria-label="props.alt" muted loop playsinline preload="none"></video>
</template>
