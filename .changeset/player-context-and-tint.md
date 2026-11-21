---
"@uberscene/player": patch
---

Two player fixes:

- A player that makes its own `AudioContext` now closes it on `dispose()`. Each remount (a media change, React
  StrictMode, switching projects) left one open, and browsers refuse new contexts past their limit. A context passed in
  as `audioContext` is still the caller's to close.
- An `<Svg>` tint reads its colour as CSS does. A name such as `red` came out grey, `rgb(100%, 0%, 0%)` dark red and
  `hsl(...)` white; the tint now uses the same colour reading as the filters.
