import { describe, expect, it } from "vitest";
import { sanitizePlaces } from "@/lib/tripPlaces";

describe("sanitizePlaces", () => {
  it("keeps well-formed places in order, including Hebrew names", () => {
    expect(
      sanitizePlaces([
        { id: "a", name: "טוקיו", done: true },
        { id: "b", name: "  Kyoto  ", done: false },
      ]),
    ).toEqual([
      { id: "a", name: "טוקיו", done: true },
      { id: "b", name: "Kyoto", done: false },
    ]);
  });

  it("drops malformed entries", () => {
    expect(sanitizePlaces("Tokyo")).toEqual([]);
    expect(sanitizePlaces([null, { id: "", name: "x" }, { id: "c", name: "   " }, { id: "d", name: "Osaka", done: "yes" }])).toEqual([
      { id: "d", name: "Osaka", done: false },
    ]);
  });
});
