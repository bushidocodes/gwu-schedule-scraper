import { describe, it, expect } from "vitest";
import { toErrorMessage } from "./utils.ts";

describe("toErrorMessage", () => {
  it("returns the message property for a real Error", () => {
    expect(toErrorMessage(new Error("something went wrong"))).toBe("something went wrong");
  });

  it("returns the message for an Error subclass", () => {
    expect(toErrorMessage(new TypeError("bad type"))).toBe("bad type");
  });

  it("converts a thrown string to its string value", () => {
    expect(toErrorMessage("oops")).toBe("oops");
  });

  it("converts a thrown number to its string representation", () => {
    expect(toErrorMessage(42)).toBe("42");
  });

  it("converts null to the string 'null'", () => {
    expect(toErrorMessage(null)).toBe("null");
  });

  it("converts undefined to the string 'undefined'", () => {
    expect(toErrorMessage(undefined)).toBe("undefined");
  });

  it("converts a plain object via String()", () => {
    expect(toErrorMessage({ code: 500 })).toBe("[object Object]");
  });
});
