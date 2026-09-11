import { describe, expect, test } from "bun:test";
import { ValidationError } from "../errors/app-error";
import { assertAllowedUpload } from "./assert-allowed-upload";

describe("assertAllowedUpload", () => {
  test("accepts PDF and JPEG", () => {
    expect(() => assertAllowedUpload("application/pdf")).not.toThrow();
    expect(() => assertAllowedUpload("image/jpeg; charset=binary")).not.toThrow();
  });

  test("rejects HTML and plain text", () => {
    expect(() => assertAllowedUpload("text/html")).toThrow(ValidationError);
    expect(() => assertAllowedUpload("text/plain")).toThrow(ValidationError);
  });
});
