import { describe, expect, test } from "bun:test";
import { PingUseCase } from "./Ping.usecase";

describe("PingUseCase", () => {
  test("returns service liveness status", () => {
    const result = new PingUseCase().execute();
    expect(result).toEqual({ ok: true, service: "karyahr-be" });
  });
});
