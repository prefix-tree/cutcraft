<script setup lang="ts">
// The landing page's features, in the order a video is made: write it, play and edit it, check it, export it, hand
// it to an agent, then what comes next. Groups sit side by side three cards to a row. Each card names one feature, says what it does in a line, and links to its guide.
import { withBase } from "vitepress";

interface Feature {
  icon: keyof typeof ICONS;
  title: string;
  text: string;
  link: string;
  tag?: string;
}

// 24 px line icons, drawn for this page: stroke only, so they take the text colour.
const ICONS = {
  file: "M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z M14 3v5h5 M9 13h6 M9 17h4",
  timeline: "M3 6h8 M14 6h7 M3 12h4 M10 12h11 M3 18h11 M17 18h4 M12 3v18",
  captions: "M4 5h16a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H9l-4 3v-3H4a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1z M7 10h6 M15 10h2 M7 13h3 M12 13h5",
  effects: "M12 3a9 9 0 1 0 0 18a9 9 0 0 0 0-18z M12 3v18 M12 7.5h7.5 M12 12h9 M12 16.5h7.5",
  graphics: "M3 15h12v5H3z M6 4h12l-3 7H3z M18 14l3 3l-3 3",
  code: "M8 7l-5 5l5 5 M16 7l5 5l-5 5 M14 4l-4 16",
  player: "M3 5h18v14H3z M10 9l5 3l-5 3z",
  edit: "M4 20h4L19 9l-4-4L4 16z M13 7l4 4 M14 20h6",
  check: "M3 4h8v7H3z M13 4h8v7h-8z M3 13h8v7H3z M14 17l2 2l4-4",
  export: "M12 3v12 M7 10l5 5l5-5 M4 17v3h16v-3",
  chip: "M7 7h10v10H7z M10 10h4v4h-4z M10 3v4 M14 3v4 M10 17v4 M14 17v4 M3 10h4 M3 14h4 M17 10h4 M17 14h4",
  agent: "M3 5h18v14H3z M7 10l3 2l-3 2 M12 15h5",
  cube: "M12 3l8 4.5v9L12 21l-8-4.5v-9z M12 12l8-4.5 M12 12L4 7.5 M12 12v9",
};

const GROUPS: { label: string; features: Feature[] }[] = [
  {
    label: "Write the video",
    features: [
      {
        icon: "file",
        title: "One file is the video",
        text: "A TSX file holds the project, the edit and the code. Drag a clip's end and one value changes in the file.",
        link: "/guide/the-file",
      },
      {
        icon: "timeline",
        title: "Timeline elements",
        text: "Clips, tracks, transitions, titles, shapes, SVG, masks, keyframes, speed ramps, freeze frames and multicam.",
        link: "/reference/elements/",
      },
      {
        icon: "captions",
        title: "Captions and sound",
        text: "Captions from the clip's transcript that follow every trim, as karaoke or word by word. Volume, fades, ducking and pan.",
        link: "/guide/captions-and-sound",
      },
      {
        icon: "effects",
        title: "Effects and transitions",
        text: "45 of them, from exposure, curves and LUTs to keying and film burn, run as shaders in the preview and the export. Or your own in GLSL.",
        link: "/reference/effects/",
      },
      {
        icon: "graphics",
        title: "Motion graphics",
        text: "Lower thirds, callouts, counters, badges and type cards, ten ready-made blocks, and themes with fonts.",
        link: "/reference/components/",
      },
      {
        icon: "code",
        title: "Free code",
        text: "Any React, CSS, canvas, three.js or Motion on the video's clock, frame-exact when you scrub or export.",
        link: "/guide/free-code",
      },
    ],
  },
  {
    label: "Play and edit it",
    features: [
      {
        icon: "player",
        title: "Player",
        text: "A React <Player> that plays the file in your app, and a framework-free PlayerCore.",
        link: "/guide/player",
      },
      {
        icon: "edit",
        title: "Editing API",
        text: "99 undoable actions (trim, move, retime, restyle), each written back into the file.",
        link: "/guide/editing",
      },
    ],
  },
  {
    label: "Check it without watching",
    features: [
      {
        icon: "check",
        title: "Review tools",
        text: "Sheets of frames with the sound under them, the timeline as text, a safe-zone layout check, and lint --fix for older files.",
        link: "/guide/checking",
      },
    ],
  },
  {
    label: "Export it",
    features: [
      {
        icon: "export",
        title: "Export",
        text: "MP4, WebM and AV1, MP3 and WAV, stills and subtitles, rendered in headless Chrome with no FFmpeg. Motion blur, drafts and parallel tabs.",
        link: "/guide/exporting",
      },
      {
        icon: "chip",
        title: "Native codecs",
        text: "Rust codecs on FilmCraft's craft-libs: decode HEVC, ProRes and DNxHR, and write a ProRes master.",
        link: "/guide/native-codecs",
        tag: "Experimental",
      },
    ],
  },
  {
    label: "With your agent",
    features: [
      {
        icon: "agent",
        title: "Agent skill",
        text: "For Claude Code, Codex, Cursor, Gemini CLI and others: the agent writes the file, checks it with frame sheets and renders it.",
        link: "/guide/agents",
      },
    ],
  },
  {
    label: "Next",
    features: [
      {
        icon: "cube",
        title: "3D that guides video models",
        text: "A three.js scene and its camera path in the same file, rendering guidance for generative video models.",
        link: "/guide/free-code",
        tag: "Roadmap",
      },
    ],
  },
];
</script>

<template>
  <div class="cc-features">
    <div v-for="group in GROUPS" :key="group.label" class="cc-features-group"
      :class="{ wide: group.label === 'Next' }"
      :style="{
        '--span': group.label === 'Next' ? 3 : Math.min(group.features.length, 3),
        '--cols': Math.min(group.features.length, 3),
      }">
      <p class="cc-features-label">{{ group.label }}</p>
      <ul class="cc-features-cards">
        <li v-for="f in group.features" :key="f.title">
          <a :href="withBase(f.link)" class="cc-feature">
            <span class="cc-feature-icon" aria-hidden="true">
              <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.6"
                stroke-linecap="round" stroke-linejoin="round"><path :d="ICONS[f.icon]" /></svg>
            </span>
            <span class="cc-feature-title">{{ f.title }}<span v-if="f.tag" class="cc-feature-tag">{{ f.tag }}</span></span>
            <span class="cc-feature-text">{{ f.text }}</span>
          </a>
        </li>
      </ul>
    </div>
  </div>
</template>
