import { describe, expect, it } from "vitest";
import { shortenText } from "./text-format.js";

describe("shortenText", () => {
  it("returns original text when it fits", () => {
    expect(shortenText("propel", 16)).toBe("propel");
  });

  it("truncates and appends ellipsis when over limit", () => {
    expect(shortenText("propel-status-output", 10)).toBe("propel-…");
  });

  it("counts multi-byte characters correctly", () => {
    expect(shortenText("hello🙂world", 7)).toBe("hello🙂…");
  });
});
