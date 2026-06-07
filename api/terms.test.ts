import { describe, it, expect } from "vitest";
import { getTerms, isValidTermId } from "./terms.ts";

describe("getTerms", () => {
  it("includes terms for the current year", () => {
    const currentYear = new Date().getFullYear();
    const ids = getTerms().map((t) => t.id);
    expect(ids).toContain(`${currentYear}01`);
    expect(ids).toContain(`${currentYear}02`);
    expect(ids).toContain(`${currentYear}03`);
  });

  it("includes terms one year before and two years after the current year", () => {
    const currentYear = new Date().getFullYear();
    const ids = getTerms().map((t) => t.id);
    expect(ids).toContain(`${currentYear - 1}01`);
    expect(ids).toContain(`${currentYear + 2}03`);
  });

  it("returns terms in reverse chronological order", () => {
    const terms = getTerms();
    for (let i = 1; i < terms.length; i++) {
      expect(terms[i - 1].id >= terms[i].id).toBe(true);
    }
  });

  it("returns 12 terms covering a 4-year window", () => {
    expect(getTerms()).toHaveLength(12);
  });

  it("includes correct labels", () => {
    const currentYear = new Date().getFullYear();
    const term = getTerms().find((t) => t.id === `${currentYear}01`);
    expect(term?.label).toBe(`Spring ${currentYear}`);
  });
});

describe("isValidTermId", () => {
  it("accepts valid term IDs", () => {
    expect(isValidTermId("202601")).toBe(true);
    expect(isValidTermId("202802")).toBe(true);
    expect(isValidTermId("203003")).toBe(true);
  });

  it("rejects invalid term IDs", () => {
    expect(isValidTermId("202604")).toBe(false);
    expect(isValidTermId("20260")).toBe(false);
    expect(isValidTermId("abcd01")).toBe(false);
  });
});
