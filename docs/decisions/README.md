# Decision records

Why UberScene is built the way it is, one decision per file, in the order they were
made. A record is never edited to say something else; a change of mind adds a
new record that supersedes the old one. [Core principles](../guide/principles.md)
sums them up.

| | Decision |
|---|---|
| [0032](./0032-native-codecs-behind-a-flag.md) | Native codecs behind a flag: craft-video decodes and encodes with `UBERSCENE_CODECS` (experimental) |
| [0033](./0033-time-in-ticks.md) | Time in ticks: frame and sample conversions count 1/254,016,000,000 s, NTSC rates are exact, drop-frame timecode |
| [0034](./0034-the-editor-is-a-constructor.md) | The editor is a constructor of building blocks with context and hooks; its styling is a shadcn registry (accepted in part: the registry and its demo) |
