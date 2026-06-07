import { describe, it, expect, vi } from "vitest";
import { normalizeSubject, parseDayTimes, parseFromTo, parseCourses } from "./parser.ts";

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
    expect(isNaN(result[1])).toBe(true);
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

  it("returns null times for courses with no scheduled time", () => {
    const result = parseDayTimes("", "");
    expect(result).toEqual([]);
  });
});

describe("parseCourses", () => {
  const makeRow = (cells: string[]) =>
    `<table><tr>${cells.map((c) => `<td>${c}</td>`).join("")}</tr></table>`;

  it("parses an OPEN course", () => {
    const html = makeRow([
      "OPEN", "12906", "CSCI 1011", "10",
      "Introduction to Programming with Java", "3.00",
      "Vidrine, C", "REMOTE INSTR", "T 06:10PM-08:40PM", "01/11/21-04/26/21",
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
      "CLOSED", "99999", "CSCI 2113", "11",
      "Software Engineering", "3.00", "Smith, J",
      "SEH 1300", "MW 03:35PM-04:50PM", "01/11/21-04/26/21",
    ]);
    const courses = parseCourses(html);
    expect(courses).toHaveLength(1);
    expect(courses[0].crn).toBe(99999);
    expect(courses[0].schedule).toHaveLength(2);
  });

  it("skips tables that are not course rows", () => {
    const html = `<table><tr><td>HEADER</td></tr></table>` + makeRow([
      "OPEN", "12906", "CSCI 1011", "10", "Intro to Java",
      "3.00", "Vidrine, C", "REMOTE INSTR", "T 06:10PM-08:40PM", "01/11/21-04/26/21",
    ]);
    expect(parseCourses(html)).toHaveLength(1);
  });

  it("returns an empty array for HTML with no course tables", () => {
    expect(parseCourses("<html><body><p>No courses</p></body></html>")).toEqual([]);
  });
});
