import { describe, expect, test } from "bun:test";
import {
  addWorkDays,
  formatWorkDate,
  inclusiveWorkDays,
  jakartaDateToWorkDate,
  jakartaWallToUtc,
  jakartaYearMonth,
  toJakartaParts,
  workDateFromInstant,
} from "./jakarta-time";

describe("jakarta-time", () => {
  test("maps UTC instant to Jakarta parts", () => {
    const parts = toJakartaParts(new Date("2026-09-08T01:00:00.000Z"));
    expect(parts.year).toBe(2026);
    expect(parts.month).toBe(9);
    expect(parts.day).toBe(8);
    expect(parts.minuteOfDay).toBe(8 * 60);
  });

  test("formats work dates and inclusive spans", () => {
    const start = jakartaDateToWorkDate(2026, 9, 8);
    const end = addWorkDays(start, 2);
    expect(formatWorkDate(start)).toBe("2026-09-08");
    expect(inclusiveWorkDays(start, end)).toBe(3);
  });

  test("converts Jakarta wall time to UTC", () => {
    const workDate = jakartaDateToWorkDate(2026, 9, 8);
    expect(jakartaWallToUtc(workDate, 8 * 60).toISOString()).toBe("2026-09-08T01:00:00.000Z");
  });

  test("year-month key uses Jakarta calendar", () => {
    expect(jakartaYearMonth(new Date("2026-08-31T17:30:00.000Z"))).toBe(202609);
    expect(workDateFromInstant(new Date("2026-08-31T17:30:00.000Z")).toISOString()).toBe(
      "2026-09-01T00:00:00.000Z",
    );
  });
});
