import { describe, expect, test } from "bun:test";
import { ValidationError } from "../errors/app-error";
import { routeParam } from "./route-param";

describe("routeParam", () => {
  test("returns a non-empty string param", () => {
    expect(routeParam("role-1", "id")).toBe("role-1");
  });

  test("rejects arrays and empty values", () => {
    expect(() => routeParam(["a", "b"], "id")).toThrow(ValidationError);
    expect(() => routeParam("", "id")).toThrow(ValidationError);
    expect(() => routeParam(undefined, "id")).toThrow(ValidationError);
  });
});
