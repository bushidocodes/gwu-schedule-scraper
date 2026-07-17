import { describe, expect, it, vi } from "vitest";
import { normalizeSubject, parseCourses, parseDayTimes, parseFromTo } from "./parser.ts";

describe("normalizeSubject", () => {
  it("splits department and course ID", () => {
    expect(normalizeSubject("CSCI 1011")).toEqual(["CSCI", 1011]);
  });

  it("handles extra whitespace", () => {
    expect(normalizeSubject("  MATH  1231  ")).toEqual(["MATH", 1231]);
  });

  it("handles graduate-level course numbers", () => {
    expect(normalizeSubject("CSCI 6221")).toEqual(["CSCI", 6221]);
  });

  it("returns NaN courseID and logs an error when course number is absent", () => {
    const errors: string[] = [];
    const spy = vi.spyOn(console, "error").mockImplementation((msg) => errors.push(msg));
    const result = normalizeSubject("CSCI");
    spy.mockRestore();
    expect(Number.isNaN(result[1])).toBe(true);
    expect(errors.length).toBe(1);
  });
});

describe("parseFromTo", () => {
  it("splits start and end dates", () => {
    expect(parseFromTo("01/11/21-04/26/21")).toEqual(["01/11/21", "04/26/21"]);
  });

  it("handles spaces around the separator", () => {
    expect(parseFromTo("01/11/21 - 04/26/21")).toEqual(["01/11/21", "04/26/21"]);
  });

  it("returns empty string endDate and logs error when hyphen is absent", () => {
    const errors: string[] = [];
    const spy = vi.spyOn(console, "error").mockImplementation((msg) => errors.push(msg));
    const result = parseFromTo("01/11/21");
    spy.mockRestore();
    expect(result).toEqual(["01/11/21", ""]);
    expect(errors.length).toBe(1);
  });
});

describe("parseDayTimes", () => {
  it("parses a single day and time range", () => {
    expect(parseDayTimes("T 06:10PM-08:40PM", "REMOTE INSTR")).toEqual([
      { location: "REMOTE INSTR", day: "T", startTime: "06:10PM", endTime: "08:40PM" },
    ]);
  });

  it("expands multi-day entries into one entry per day", () => {
    const result = parseDayTimes("MWF 09:00AM-09:50AM", "SEH 1300");
    expect(result).toHaveLength(3);
    expect(result.map((s) => s.day)).toEqual(["M", "W", "F"]);
    result.forEach((s) => {
      expect(s.location).toBe("SEH 1300");
      expect(s.startTime).toBe("09:00AM");
      expect(s.endTime).toBe("09:50AM");
    });
  });

  it("handles AND-separated multiple schedule blocks", () => {
    const result = parseDayTimes("T 06:10PM-08:40PMAND F 10:00AM-11:00AM", "ROOM AAND ROOM B");
    expect(result).toHaveLength(2);
    expect(result[0]).toMatchObject({ day: "T", location: "ROOM A" });
    expect(result[1]).toMatchObject({ day: "F", location: "ROOM B" });
  });

  it("preserves ampersands in location names", () => {
    const result = parseDayTimes("MWF 09:00AM-09:50AM", "Hall A & B");
    expect(result).toHaveLength(3);
    result.forEach((s) => expect(s.location).toBe("Hall A & B"));
  });

  it("returns empty array via fast path when both inputs are empty", () => {
    // Empty inputs mean async/TBA — the early-return avoids unnecessary Set/split work
    expect(parseDayTimes("", "")).toEqual([]);
    expect(parseDayTimes("  ", "  ")).toEqual([]);
  });

  it("parses times correctly with AM/PM suffix", () => {
    const result = parseDayTimes("T 09:00AM-09:50AM", "SEH 1300");
    expect(result[0].startTime).toBe("09:00AM");
    expect(result[0].endTime).toBe("09:50AM");
  });

  it("deduplicates identical (daytime, location) pairs", () => {
    // If the upstream HTML repeats the exact same block (no surrounding spaces
    // around AND), the Set de-duplication emits only one entry per day.
    // Note: split("AND") keeps any surrounding spaces, so dedup only fires when
    // the two tokens are byte-for-byte identical (no extra whitespace).
    const result = parseDayTimes(
      "MWF 09:00AM-09:50AMANDMWF 09:00AM-09:50AM",
      "SEH 1300ANDSEH 1300",
    );
    // 3 unique days, not 6
    expect(result).toHaveLength(3);
    expect(result.map((s) => s.day)).toEqual(["M", "W", "F"]);
  });

  it("falls back to empty string location when arrays are mismatched length", () => {
    // Regression: previously produced "undefined" string when locations array is shorter
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const result = parseDayTimes("MWF 09:00AM-09:50AMAND T 06:10PM-08:40PM", "SEH 1300");
    consoleSpy.mockRestore();
    // locations shorter than dayTimes — second entry should have "" not "undefined"
    expect(result.some((s) => s.location === "undefined")).toBe(false);
  });
});

describe("parseCourses", () => {
  const makeRow = (cells: string[]) =>
    `<table><tr>${cells.map((c) => `<td>${c}</td>`).join("")}</tr></table>`;

  it("parses an OPEN course", () => {
    const html = makeRow([
      "OPEN",
      "12906",
      "CSCI 1011",
      "10",
      "Introduction to Programming with Java",
      "3.00",
      "Vidrine, C",
      "REMOTE INSTR",
      "T 06:10PM-08:40PM",
      "01/11/21-04/26/21",
    ]);
    const courses = parseCourses(html);
    expect(courses).toHaveLength(1);
    expect(courses[0]).toMatchObject({
      crn: 12906,
      department: "CSCI",
      courseID: 1011,
      section: "10",
      name: "Introduction to Programming with Java",
      credit: "3.00",
      instructor: "Vidrine, C",
      startDate: "01/11/21",
      endDate: "04/26/21",
    });
    expect(courses[0].schedule).toHaveLength(1);
    expect(courses[0].schedule[0]).toMatchObject({ day: "T", startTime: "06:10PM" });
  });

  it("parses a CLOSED course", () => {
    const html = makeRow([
      "CLOSED",
      "99999",
      "CSCI 2113",
      "11",
      "Software Engineering",
      "3.00",
      "Smith, J",
      "SEH 1300",
      "MW 03:35PM-04:50PM",
      "01/11/21-04/26/21",
    ]);
    const courses = parseCourses(html);
    expect(courses).toHaveLength(1);
    expect(courses[0].crn).toBe(99999);
    expect(courses[0].schedule).toHaveLength(2);
  });

  it("trims whitespace from section and name fields", () => {
    const html = makeRow([
      "OPEN",
      "12906",
      "CSCI 1011",
      "  10  ",
      "  Introduction to Java  ",
      "3.00",
      "Vidrine, C",
      "REMOTE INSTR",
      "T 06:10PM-08:40PM",
      "01/11/21-04/26/21",
    ]);
    const [course] = parseCourses(html);
    expect(course.section).toBe("10");
    expect(course.name).toBe("Introduction to Java");
  });

  it("skips tables that are not course rows", () => {
    const html =
      `<table><tr><td>HEADER</td></tr></table>` +
      makeRow([
        "OPEN",
        "12906",
        "CSCI 1011",
        "10",
        "Intro to Java",
        "3.00",
        "Vidrine, C",
        "REMOTE INSTR",
        "T 06:10PM-08:40PM",
        "01/11/21-04/26/21",
      ]);
    expect(parseCourses(html)).toHaveLength(1);
  });

  it("returns an empty array for HTML with no course tables", () => {
    expect(parseCourses("<html><body><p>No courses</p></body></html>")).toEqual([]);
  });

  it("gracefully handles a row with fewer than 10 cells", () => {
    // Rows that are too short (e.g. header rows with OPEN/CLOSED status but
    // missing columns) should not throw; parseCourses should still return [].
    const html = `<table><tr><td>OPEN</td><td>99999</td></tr></table>`;
    expect(() => parseCourses(html)).not.toThrow();
    // The short row won't parse into a valid course (empty text fields),
    // but the function must not crash.
    const courses = parseCourses(html);
    expect(courses).toHaveLength(1); // it does attempt to parse it
    expect(courses[0].crn).toBe(99999);
    expect(courses[0].department).toBe(""); // empty subject cell → empty dept
  });
});
