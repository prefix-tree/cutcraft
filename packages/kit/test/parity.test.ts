import { describe, expect, it } from "vitest";
import "@cutcraft/kit";
import { parityGaps, PARITY } from "../scripts/parity";

describe("parity with OpenReel", () => {
  it("maps every OpenReel action and references only registered handlers", () => {
    expect(PARITY).toHaveLength(115);
    expect(parityGaps()).toEqual({ unmappedOurs: [], unknownOurs: [] });
  });
});
