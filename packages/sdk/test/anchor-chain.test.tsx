// Elements timed off other elements are placed in passes, each placing what its anchor now allows. A chain longer than
// any fixed number of passes, written against its order, must still be placed, and a real cycle still reported.
import { describe, expect, it } from "vitest";

import { Composition, Title, Track } from "@uberscene/kit";
import { collectModule, Executor, resolve } from "@uberscene/sdk";

const N = 40;

/** Titles t0..t39, each starting where the one before ends, written last first so each pass places one. */
const Chain = ({ n = N }: { n?: number }) => (
  <Composition fps={30} width={1280} height={720}>
    <Track id="over" layout="free">
      {Array.from({ length: n }, (_, k) => n - 1 - k).map((i) =>
        i === 0 ? (
          <Title key={i} id="t0" start={0} duration={1}>
            0
          </Title>
        ) : (
          <Title key={i} id={`t${i}`} anchor={`t${i - 1}.end`} duration={1}>
            {String(i)}
          </Title>
        ),
      )}
    </Track>
  </Composition>
);

const manifest = { assets: {} };

describe("an anchor chain", () => {
  it(`of ${N} titles written in reverse is placed, with no false cycle`, () => {
    const state = resolve(collectModule({ default: () => <Chain /> }), manifest);
    expect(state.errors.filter((e) => e.code === "CYCLE")).toEqual([]);
    for (let i = 0; i < N; i++) expect(state.items.get(`t${i}`)?.start).toBe(i);
  });

  it("can be lengthened by an edit", () => {
    const exec = new Executor({ tree: collectModule({ default: () => <Chain /> }), manifest });
    const result = exec.execute({
      type: "clip/trim",
      params: { id: "t0", edge: "out", value: 2 },
    });
    expect(result.ok).toBe(true);
    expect(exec.state().items.get(`t${N - 1}`)?.start).toBe(N);
  });

  it("that loops is still reported as a cycle", () => {
    const Loop = () => (
      <Composition fps={30} width={1280} height={720}>
        <Track id="over" layout="free">
          <Title id="a" anchor="b.end" duration={1}>
            A
          </Title>
          <Title id="b" anchor="a.end" duration={1}>
            B
          </Title>
        </Track>
      </Composition>
    );
    const state = resolve(collectModule({ default: Loop }), manifest);
    expect(
      state.errors
        .filter((e) => e.code === "CYCLE")
        .map((e) => e.id)
        .sort(),
    ).toEqual(["a", "b"]);
  });
});
