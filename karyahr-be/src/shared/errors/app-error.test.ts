import { describe, expect, test } from "bun:test";
import {
  AppError,
  ConflictError,
  ForbiddenError,
  NotFoundError,
  UnauthorizedError,
  ValidationError,
  mapError,
} from "./app-error";

describe("mapError", () => {
  test("maps AppError subclasses to status and code", () => {
    expect(mapError(new NotFoundError("missing")).statusCode).toBe(404);
    expect(mapError(new NotFoundError("missing")).body.error).toBe("NOT_FOUND");
    expect(mapError(new ValidationError()).statusCode).toBe(400);
    expect(mapError(new ConflictError()).statusCode).toBe(409);
    expect(mapError(new UnauthorizedError()).statusCode).toBe(401);
    expect(mapError(new ForbiddenError()).statusCode).toBe(403);
    expect(mapError(new AppError("denied", 403, "FORBIDDEN")).statusCode).toBe(403);
  });

  test("maps Zod-like validation errors to 400", () => {
    const zodLike = {
      name: "ZodError",
      issues: [{ message: "Required" }],
    };
    const mapped = mapError(zodLike);
    expect(mapped.statusCode).toBe(400);
    expect(mapped.body.error).toBe("VALIDATION_ERROR");
    expect(mapped.body.message).toBe("Required");
  });

  test("maps unknown errors to 500 without leaking details", () => {
    const mapped = mapError(new Error("secret"), "req-1");
    expect(mapped.statusCode).toBe(500);
    expect(mapped.body).toEqual({
      error: "INTERNAL_ERROR",
      message: "Internal server error",
      requestId: "req-1",
    });
  });
});
