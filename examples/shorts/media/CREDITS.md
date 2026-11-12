# Footage

## eclipse.webm

Ernie Wright, of NASA's Scientific Visualization Studio, answering questions about the total lunar eclipse of
14 March 2025.

- Source: NASA's Scientific Visualization Studio, "NASA Interview Opportunity: Watch A Red Moon Dance Across The Sky
  THIS Friday", item 14791, <https://svs.gsfc.nasa.gov/14791/>, file `Ernie_Wright_lunar_eclipse.mp4`.
- Licence: public domain, as a work of NASA. NASA does not endorse this project; its name and insignia are not used
  here beyond what the footage itself shows.
- What was done to it: 79 seconds cut from the eight minute interview (from 5 min 14 s), cropped to a square around
  the speaker, and encoded as VP9 with Opus sound.

`eclipse.json` is the transcript of those 79 seconds with a time for every word, made with the open-source Whisper
model (`small.en`) and corrected by hand for capital letters. `cutcraft add media/eclipse.webm` reads it into
`manifest.json`.
