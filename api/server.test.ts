import { describe, it, expect } from "vitest";
import { toApiSection } from "./server.ts";
import type { Course } from "../src/types.ts";

const baseCourse: Course = {
  crn: 12906,
  department: "CSCI",
  courseID: 1011,
  section: "10",
  name: "Introduction to Programming with Java",
  credit: "3.00",
  instructor: "Vidrine, C",
  schedule: [{ location: "REMOTE INSTR", day: "T", startTime: "06:10PM", endTime: "08:40PM" }],
  startDate: "01/11/21",
  endDate: "04/26/21",
};

describe("toApiSection", () => {
  it("does not leak the instructor field into the API output", () => {
    const section = toApiSection(baseCourse);
    expect(section).not.toHaveProperty("instructor");
  });

  it("wraps instructor into instructors array", () => {
    const section = toApiSection(baseCourse);
    expect(section.instructors).toEqual(["Vidrine, C"]);
  });

  it("produces empty instructors array when instructor is empty string", () => {
    const section = toApiSection({ ...baseCourse, instructor: "" });
    expect(section.instructors).toEqual([]);
  });

  it("coerces null schedule times to empty strings", () => {
    const course: Course = {
      ...baseCourse,
      schedule: [{ location: "TBD", day: "M", startTime: null, endTime: null }],
    };
    const section = toApiSection(course);
    expect(section.schedule[0].startTime).toBe("");
    expect(section.schedule[0].endTime).toBe("");
  });

  it("preserves all other course fields", () => {
    const section = toApiSection(baseCourse);
    expect(section).toMatchObject({
      crn: 12906,
      department: "CSCI",
      courseID: 1011,
      section: "10",
      name: "Introduction to Programming with Java",
      credit: "3.00",
      startDate: "01/11/21",
      endDate: "04/26/21",
    });
  });
});
