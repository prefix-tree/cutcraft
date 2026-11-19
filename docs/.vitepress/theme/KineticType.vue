<!-- Words whose letters lie scattered and turned, then fly into place when the block scrolls into view, the way a
     cut assembles shots. Decoration over real text: screen readers get the plain words, and a reader who asked for
     reduced motion sees them already set. -->
<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from "vue";

const props = defineProps<{ words: string[] }>();

// A fixed scatter per letter (not Math.random), so the server render and the browser agree.
function scatter(i: number): string {
  const r = (n: number) => ((Math.sin(i * 12.9898 + n * 78.233) * 43758.5453) % 1 + 1) % 1;
  const x = (r(1) - 0.5) * 520;
  const y = (r(2) - 0.5) * 360;
  const turn = (r(3) - 0.5) * 220;
  return `translate(${x.toFixed(0)}px, ${y.toFixed(0)}px) rotate(${turn.toFixed(0)}deg)`;
}

const root = ref<HTMLElement>();
const set = ref(false);
let observer: IntersectionObserver | undefined;

onMounted(() => {
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches || !("IntersectionObserver" in window)) {
    set.value = true;
    return;
  }
  observer = new IntersectionObserver(
    ([entry]) => {
      set.value = entry.isIntersecting;
    },
    { threshold: 0.45 },
  );
  if (root.value) observer.observe(root.value);
});
onBeforeUnmount(() => observer?.disconnect());

let n = 0;
const lines = props.words.map((word) => [...word].map((ch) => ({ ch, i: n++ })));
</script>

<template>
  <div ref="root" class="cc-kinetic" :class="{ set }">
    <span class="cc-sr">{{ props.words.join(" ") }}</span>
    <span v-for="(line, l) in lines" :key="l" class="cc-kinetic-line" aria-hidden="true">
      <span v-for="{ ch, i } in line" :key="i" class="cc-kinetic-ch"
        :style="{ '--from': scatter(i), transitionDelay: `${(i % 9) * 35}ms` }">{{ ch === " " ? " " : ch }}</span>
    </span>
  </div>
</template>
