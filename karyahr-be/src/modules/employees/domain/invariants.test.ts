import { describe, expect, test } from "bun:test";
import { ValidationError } from "../../../shared/errors/app-error";
import { assertEmployeeInvariants, parseEssPayload } from "./invariants";

describe("assertEmployeeInvariants", () => {
  test("rejects an employee as their own manager", () => {
    expect(() =>
      assertEmployeeInvariants({
        id: "e1",
        managerId: "e1",
        status: "ACTIVE",
        contractType: "PERMANENT",
      }),
    ).toThrow(ValidationError);
  });

  test("accepts valid status and contract", () => {
    const result = assertEmployeeInvariants({
      status: "PROBATION",
      contractType: "CONTRACT",
    });
    expect(result.status).toBe("PROBATION");
  });
});

describe("parseEssPayload", () => {
  test("keeps only allowed personal fields", () => {
    const payload = parseEssPayload({ address: "Bandung", fullName: "Nope" });
    expect(payload).toEqual({ address: "Bandung" });
  });

  test("rejects an empty payload", () => {
    expect(() => parseEssPayload({ fullName: "Nope" })).toThrow(ValidationError);
  });
});
