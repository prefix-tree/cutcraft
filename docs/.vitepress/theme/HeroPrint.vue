<!-- The landing hero's backdrop, a woodblock print in the logo's terms: paper grain, a red sun that a katana cuts in
     two (the halves slide apart along the cut), and seigaiha waves the gallery rises out of. Decoration only: hidden
     from screen readers, drawn in the theme's colours, and still for a reader who asked for reduced motion. -->
<template>
  <div class="cc-print" aria-hidden="true">
    <svg class="cc-print-grain" width="100%" height="100%">
      <defs>
        <pattern id="cc-print-grain" width="7" height="7" patternUnits="userSpaceOnUse" patternTransform="rotate(35)">
          <path d="M0 0V7" />
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill="url(#cc-print-grain)" />
    </svg>

    <svg class="cc-print-sun" viewBox="-40 -40 400 400">
      <defs>
        <!-- The two sides of the cut, a line from lower left to upper right through the sun. -->
        <clipPath id="cc-print-above"><path d="M-60 400 L420 -80 L-60 -80Z" /></clipPath>
        <clipPath id="cc-print-below"><path d="M-60 400 L420 -80 L420 420 L-60 420Z" /></clipPath>
      </defs>
      <g class="cc-print-half above" clip-path="url(#cc-print-above)">
        <circle cx="160" cy="160" r="140" />
        <path d="M58 86a140 140 0 0 1 132-58" />
      </g>
      <g class="cc-print-half below" clip-path="url(#cc-print-below)">
        <circle cx="160" cy="160" r="140" />
      </g>
      <line class="cc-print-cut" x1="-30" y1="350" x2="350" y2="-30" pathLength="1" />
    </svg>

    <svg class="cc-print-sea" width="100%" height="100%">
      <defs>
        <!-- Seigaiha: rows of concentric arcs, each row half a wave across from the one above and drawn over it. -->
        <pattern id="cc-print-waves" width="48" height="24" patternUnits="userSpaceOnUse">
          <g v-for="[x, y] in [[0, 0], [48, 0], [24, 12], [0, 24], [48, 24]]" :key="`${x},${y}`">
            <circle v-for="r in [24, 18, 12, 6]" :key="r" :cx="x" :cy="y" :r="r" />
          </g>
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill="url(#cc-print-waves)" />
    </svg>
  </div>
</template>
