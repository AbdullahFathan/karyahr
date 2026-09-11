import { describe, expect, test } from "bun:test";
import { attachmentContentDisposition } from "./content-disposition";

describe("attachmentContentDisposition", () => {
  test("strips quotes and newlines from the file name", () => {
    expect(attachmentContentDisposition('a"\r\nContent-Type: text/html')).toBe(
      'attachment; filename="a___Content-Type: text/html"',
    );
  });
});
