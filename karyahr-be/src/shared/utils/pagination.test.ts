import { describe, expect, test } from "bun:test";
import { parsePagination, paginationMeta } from "./pagination";

describe("parsePagination", () => {
  test("defaults to page 1 and pageSize 20", () => {
    expect(parsePagination()).toEqual({ page: 1, pageSize: 20, skip: 0, take: 20 });
  });

  test("caps pageSize at 100", () => {
    expect(parsePagination({ page: 2, pageSize: 500 }).take).toBe(100);
    expect(parsePagination({ page: 2, pageSize: 500 }).skip).toBe(100);
  });
});

describe("paginationMeta", () => {
  test("computes totalPages", () => {
    expect(paginationMeta(45, 1, 20)).toEqual({
      total: 45,
      page: 1,
      pageSize: 20,
      totalPages: 3,
    });
  });
});
