// What the model is told: the same reference for both spellings, then the one section that differs.
import type { Spelling } from "./check";

const COMMON = `You edit UberScene files: a video written as a TSX timeline. You are given a file and one change to make.
Return the whole edited file in a single \`\`\`tsx code block and nothing else. Change only what is asked.

Reference:
- <Clip>, <Title> and the other timed elements each have a literal id.
- Times are seconds from the element's own start.
- Animatable properties: box.x, box.y, transform.scale.x, transform.scale.y, transform.rotation (degrees),
  transform.opacity (0 to 1). Scale is animated per axis: x and y each get their own keys.
- Easing names: linear (the default), ease-in, ease-out, ease-in-out. A key's easing says how the value moves from
  that key to the next one.
- Effects and their params: blur (radius), glow (radius, intensity, threshold, tint).`;

const SPELLING: Readonly<Record<Spelling, string>> = {
  children: `
How animation and effects are written:
- A keyframe is a child element of what it animates, with an id unique in the file:
  <Keyframe id="a-o-0" property="transform.opacity" at={0} value={0} easing="ease-out" />
- An effect is a child element with an id, its fixed params in \`params\`:
  <Effect id="a-glow" type="glow" params={{ radius: 12 }} />
- An animated effect param is a keyframe inside the effect, naming the param:
  <Effect id="a-blur" type="blur">
    <Keyframe id="a-blur-0" param="radius" at={0} value={0} />
    <Keyframe id="a-blur-1" param="radius" at={1} value={6} />
  </Effect>
- Import Keyframe and Effect from "@uberscene/kit" when you use them.`,
  props: `
How animation and effects are written:
- An animated property is a list of keys in place of its value, inside the \`transform\` or \`box\` prop:
  transform={{ opacity: [{ at: 0, value: 0, ease: "ease-out" }, { at: 0.5, value: 1 }] }}
  transform={{ scale: { x: [{ at: 0, value: 1 }, { at: 2, value: 1.1 }], y: [{ at: 0, value: 1 }, { at: 2, value: 1.1 }] } }}
- Effects are a list on the element, each an object with its type and params:
  effects={[{ type: "glow", radius: 12 }]}
- An animated effect param is a list of keys in place of its value:
  effects={[{ type: "blur", radius: [{ at: 0, value: 0 }, { at: 1, value: 6 }] }]}
- There are no <Keyframe> or <Effect> elements.`,
};

export const systemPrompt = (spelling: Spelling): string => `${COMMON}\n${SPELLING[spelling]}`;

export const userPrompt = (file: string, ask: string): string =>
  `The file:\n\n\`\`\`tsx\n${file}\`\`\`\n\nThe change: ${ask}`;
