import { describe, expect, it } from "vitest";

import { collectModule, Executor } from "@cutcraft/kit";
import { foldToSource, loadModule } from "@cutcraft/kit/source";

const FILE = `import { Audio, Clip, Composition, Track } from "@cutcraft/kit";

export default function Video() {
  return (
    <Composition fps={30} width={640} height={360}>
      <Track id="talk" role="dialogue">
        <Clip id="a" src="asset:talk" in={0} out={4} />
      </Track>
      <Track id="bed" layout="free">
        <Audio id="music" src="asset:music" start={0} in={0} out={4} />
      </Track>
    </Composition>
  );
}
`;
const manifest = {
  assets: {
    talk: {
      id: "talk",
      kind: "video" as const,
      duration: 10,
      fps: 30,
      width: 640,
      height: 360,
      audio: { sampleRate: 48000, channels: 2, streams: 1 },
    },
    music: { id: "music", kind: "audio" as const, duration: 30, audio: { sampleRate: 48000, channels: 2, streams: 1 } },
  },
};
const open = () => new Executor({ tree: collectModule(loadModule(FILE) as never), manifest });

describe("audio/setDuck", () => {
  it("ducks under a track role, as a file can", () => {
    const exec = open();
    const result = exec.execute({
      type: "audio/setDuck",
      params: { id: "music", duck: { under: "dialogue", to: 0.2 } },
    });
    expect(result.ok).toBe(true);
    expect(exec.state().errors).toEqual([]);
    expect(foldToSource(FILE, exec.log(), exec.state()).text).toContain('duck={{ under: "dialogue", to: 0.2 }}');
  });

  it("still takes a track id, and refuses a name that is neither", () => {
    const exec = open();
    expect(exec.execute({ type: "audio/setDuck", params: { id: "music", duck: { under: "talk", to: 0.2 } } }).ok).toBe(
      true,
    );
    const wrong = exec.execute({ type: "audio/setDuck", params: { id: "music", duck: { under: "nobody", to: 0.2 } } });
    expect(wrong.ok).toBe(false);
    expect(JSON.stringify(wrong)).toContain('duck.under \\"nobody\\" is neither a track id nor a track role');
  });
});
