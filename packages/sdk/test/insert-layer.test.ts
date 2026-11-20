import { describe, expect, it } from "vitest";

import {
  buildSourceIndex,
  collectModule,
  Executor,
  foldToSource,
  insertLayer,
  loadModule,
  resolve,
} from "../src/index";

const BADGE = `import { z } from "zod";
export const schema = z.object({ label: z.string() });
export const defaults = { label: "NEW" };
export function Badge(props: { label?: string; size?: number }) {
  return <div>{props.label ?? defaults.label}</div>;
}
`;
const files = { "blocks/badge.tsx": BADGE };

const VIDEO = `import { Clip, Composition, Layer, Track } from "@uberscene/kit";

export default function Video() {
  return (
    <Composition fps={30} width={1080} height={1920}>
      <Track id="main">
        <Clip id="talk" src="asset:talk" in={0} out={6} />
      </Track>
      <Track id="graphics" layout="free">
        <Layer id="first" start={0} duration={1}>
          <div />
        </Layer>
      </Track>
    </Composition>
  );
}
`;
const manifest = { assets: { talk: { id: "talk", kind: "video" as const, duration: 10 } } };

const place = {
  track: "graphics",
  id: "badge",
  component: "Badge",
  from: "./blocks/badge",
  timing: { anchor: "talk", offset: 1, duration: 2 },
};

function stateOf(text: string) {
  return resolve(collectModule(loadModule(text, { files }) as never, {}, { index: buildSourceIndex(text) }), manifest);
}

describe("insertLayer", () => {
  it("imports the component and places it in a Layer at the end of the track", () => {
    const text = insertLayer(VIDEO, place);
    expect(text).toContain(
      'import { Clip, Composition, Layer, Track } from "@uberscene/kit";\n\nimport { Badge } from "./blocks/badge";',
    );
    expect(text).toContain(
      '        </Layer>\n        <Layer id="badge" anchor="talk" offset={1} duration={2}>\n          <Badge />\n        </Layer>\n      </Track>',
    );
    const state = stateOf(text);
    expect(state.errors).toEqual([]);
    const badge = state.items.get("badge");
    expect([badge?.start, badge?.end]).toEqual([1, 3]);
  });

  it("writes the component's props when given, and imports a name once", () => {
    const once = insertLayer(VIDEO, { ...place, props: { label: "HOT", size: 40 } });
    expect(once).toContain('<Badge label="HOT" size={40} />');
    const twice = insertLayer(once, { ...place, id: "badge2", timing: { start: 4, duration: 1 } });
    expect(twice.match(/import \{ Badge \}/g)).toHaveLength(1);
    expect(stateOf(twice).errors).toEqual([]);
  });

  it("adds Layer to the kit's import when the file does not import it, keeping the names in order", () => {
    const bare = VIDEO.replace(
      "import { Clip, Composition, Layer, Track }",
      "import { Clip, Composition, Track }",
    ).replace(/\s*<Layer id="first"[\s\S]*?<\/Layer>/, "");
    const text = insertLayer(bare, place);
    expect(text).toContain('import { Clip, Composition, Layer, Track } from "@uberscene/kit";');
    expect(stateOf(text).errors).toEqual([]);
  });

  it("opens a self-closing track", () => {
    const text = insertLayer(
      VIDEO.replace(
        '<Track id="graphics" layout="free">',
        '<Track id="extra" layout="free" />\n      <Track id="graphics" layout="free">',
      ),
      {
        ...place,
        track: "extra",
      },
    );
    expect(text).toContain('<Track id="extra" layout="free">\n        <Layer id="badge"');
    expect(stateOf(text).errors).toEqual([]);
  });

  it("refuses a missing track, a taken id and a name bound to something else", () => {
    expect(() => insertLayer(VIDEO, { ...place, track: "nope" })).toThrow(/no <Track id="nope">/);
    expect(() => insertLayer(VIDEO, { ...place, id: "first" })).toThrow(/"first" is taken/);
    expect(() => insertLayer(VIDEO, { ...place, component: "Video" })).toThrow(/already declares Video/);
    const other = VIDEO.replace("\nexport default", '\nimport { Badge } from "./elsewhere";\nexport default');
    expect(() => insertLayer(other, place)).toThrow(/already imports Badge from "\.\/elsewhere"/);
  });

  it("leaves the placed component's props to the editor's Layer handles", () => {
    const text = insertLayer(VIDEO, place);
    const tree = collectModule(loadModule(text, { files }) as never, {}, { index: buildSourceIndex(text) });
    const exec = new Executor({ tree, manifest, now: () => 0 });
    const done = exec.execute({ type: "layer/setProps", params: { id: "badge", props: { label: "SALE" } } });
    expect(done.errors ?? []).toEqual([]);
    expect(done.ok).toBe(true);
    const folded = foldToSource(text, exec.log(), exec.state());
    expect(folded.skipped).toEqual([]);
    expect(folded.text).toContain('<Badge label="SALE" />');
    expect(stateOf(folded.text).errors).toEqual([]);
  });
});
