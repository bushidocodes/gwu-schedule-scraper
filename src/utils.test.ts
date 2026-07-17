import { describe, expect, it } from "vitest";
import { isValidTermId, toErrorMessage } from "./utils.ts";

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

describe("isValidTermId", () => {
  it("accepts valid Spring term IDs", () => {
    expect(isValidTermId("202601")).toBe(true);
    expect(isValidTermId("202501")).toBe(true);
  });

  it("accepts valid Summer term IDs", () => {
    expect(isValidTermId("202602")).toBe(true);
  });

  it("accepts valid Fall term IDs", () => {
    expect(isValidTermId("202603")).toBe(true);
    expect(isValidTermId("203003")).toBe(true);
  });

  it("rejects an invalid semester code", () => {
    expect(isValidTermId("202604")).toBe(false);
    expect(isValidTermId("202600")).toBe(false);
  });

  it("rejects IDs with wrong year length", () => {
    expect(isValidTermId("26601")).toBe(false);
    expect(isValidTermId("2026001")).toBe(false);
  });

  it("rejects non-numeric input", () => {
    expect(isValidTermId("abcd01")).toBe(false);
    expect(isValidTermId("")).toBe(false);
  });
});
