<!-- The live playground: an editor beside the player, and the starter files above them. The editor and the player load
     only in the browser and only once the playground is near the screen (one lazy chunk). Without WebCodecs, the
     starter's rendered video shows instead. `share` keeps the file in the URL so a link reopens it. -->
<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from "vue";
import { withBase } from "vitepress";
import Preview from "./Preview.vue";
import { STARTERS } from "./playground/starters";

const props = defineProps<{ compact?: boolean; share?: boolean }>();
const root = ref<HTMLElement | null>(null);
const editor = ref<HTMLElement | null>(null);
const player = ref<HTMLElement | null>(null);
const active = ref(0);
const error = ref<string | null>(null);
const state = ref<"waiting" | "loading" | "live" | "fallback">("waiting");
const copied = ref(false);
let playground: { setCode(code: string): void; destroy(): void } | null = null;
let observer: IntersectionObserver | null = null;
let shareTimer: ReturnType<typeof setTimeout> | undefined;

/** base64url of the deflated file, for the URL hash. */
async function pack(code: string): Promise<string> {
  const stream = new Blob([code]).stream().pipeThrough(new CompressionStream("deflate-raw"));
  const bytes = new Uint8Array(await new Response(stream).arrayBuffer());
  let s = "";
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

async function unpack(text: string): Promise<string> {
  const s = atob(text.replace(/-/g, "+").replace(/_/g, "/"));
  const bytes = Uint8Array.from(s, (c) => c.charCodeAt(0));
  const stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream("deflate-raw"));
  return new Response(stream).text();
}

function remember(code: string): void {
  if (!props.share) return;
  clearTimeout(shareTimer);
  shareTimer = setTimeout(async () => {
    history.replaceState(null, "", `#code=${await pack(code)}`);
  }, 600);
}

async function start(): Promise<void> {
  if (state.value !== "waiting") return;
  if (!("VideoDecoder" in window) || typeof CompressionStream === "undefined") {
    state.value = "fallback";
    return;
  }
  state.value = "loading";
  let code = STARTERS[0]!.code;
  const shared = props.share ? /#code=([\w-]+)/.exec(location.hash)?.[1] : undefined;
  if (shared) code = await unpack(shared).catch(() => code);
  try {
    const { mountPlayground } = await import("./playground/mount");
    playground = mountPlayground({
      editor: editor.value!,
      player: player.value!,
      code,
      base: withBase("/"),
      onError: (message) => (error.value = message),
      onChange: remember,
    });
    state.value = "live";
  } catch (e) {
    console.error(e);
    state.value = "fallback";
  }
}

function choose(i: number): void {
  active.value = i;
  playground?.setCode(STARTERS[i]!.code);
  remember(STARTERS[i]!.code);
}

async function copyLink(): Promise<void> {
  await navigator.clipboard.writeText(location.href).catch(() => undefined);
  copied.value = true;
  setTimeout(() => (copied.value = false), 1600);
}

onMounted(() => {
  observer = new IntersectionObserver(
    ([entry]) => {
      if (!entry?.isIntersecting) return;
      observer?.disconnect();
      void start();
    },
    { rootMargin: "200px" },
  );
  if (root.value) observer.observe(root.value);
});
onBeforeUnmount(() => {
  observer?.disconnect();
  playground?.destroy();
});
</script>

<template>
  <div ref="root" :class="['cc-playground', { compact: props.compact }]" :data-state="state">
    <div class="cc-playground-bar" role="tablist" aria-label="Starter files">
      <button v-for="(s, i) in STARTERS" :key="s.name" type="button" role="tab" :aria-selected="i === active"
        :class="{ active: i === active }" :disabled="state !== 'live'" @click="choose(i)">{{ s.name }}</button>
      <button v-if="props.share && state === 'live'" type="button" class="cc-playground-share" @click="copyLink">
        {{ copied ? "Link copied" : "Copy link" }}
      </button>
    </div>
    <div v-if="state !== 'fallback'" class="cc-playground-body">
      <div class="cc-playground-editor">
        <div ref="editor" class="cc-playground-code" aria-label="The file, editable"></div>
        <pre v-if="error" class="cc-playground-error" role="alert">{{ error }}</pre>
      </div>
      <div class="cc-playground-player">
        <div ref="player"></div>
        <p v-if="state !== 'live'" class="cc-playground-loading">Loading the player…</p>
      </div>
    </div>
    <div v-else class="cc-playground-fallback">
      <Preview :src="STARTERS[active]!.preview" :alt="STARTERS[active]!.name" />
      <p>The live player needs WebCodecs (Chrome, Edge or Safari 16.4 and later). This is the same file, rendered.</p>
    </div>
  </div>
</template>
