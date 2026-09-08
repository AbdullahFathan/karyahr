import { describe, expect, test } from "bun:test";
import { wouldCreateCycle } from "./cycle";

describe("wouldCreateCycle", () => {
  test("rejects a node as its own parent", () => {
    expect(wouldCreateCycle("a", "a", new Map([["a", null]]))).toBe(true);
  });

  test("rejects assigning a descendant as parent", () => {
    const parentById = new Map<string, string | null>([
      ["root", null],
      ["child", "root"],
      ["leaf", "child"],
    ]);
    expect(wouldCreateCycle("root", "leaf", parentById)).toBe(true);
  });

  test("allows a sibling parent", () => {
    const parentById = new Map<string, string | null>([
      ["root", null],
      ["a", "root"],
      ["b", "root"],
    ]);
    expect(wouldCreateCycle("a", "b", parentById)).toBe(false);
  });
});
