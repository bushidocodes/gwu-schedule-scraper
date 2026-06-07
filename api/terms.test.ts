import { describe, it, expect } from "vitest";
import { getTerms } from "./terms.ts";

// isValidTermId is tested thoroughly in src/utils.test.ts (it now lives in
// src/utils.ts and is re-exported from here).  No duplication needed.

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

  it("re-exports isValidTermId from src/utils — import still resolves", async () => {
    // Smoke-test the re-export path so a future refactor doesn't silently break it.
    const { isValidTermId } = await import("./terms.ts");
    expect(isValidTermId("202601")).toBe(true);
    expect(isValidTermId("bad")).toBe(false);
  });
});
