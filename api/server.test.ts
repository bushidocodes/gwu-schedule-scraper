import { createServer } from "http";
import type { AddressInfo } from "net";
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { app, toApiSection } from "./server.ts";
import type { Course } from "../src/types.ts";

// Spin up a real HTTP server on a random port for route integration tests
let baseUrl: string;
let server: ReturnType<typeof createServer>;

beforeAll(async () => {
  server = createServer(app);
  await new Promise<void>((resolve) => server.listen(0, resolve));
  const port = (server.address() as AddressInfo).port;
  baseUrl = `http://localhost:${port}`;
});

afterAll(async () => {
  await new Promise<void>((resolve, reject) =>
    server.close((err) => (err ? reject(err) : resolve())),
  );
});

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

describe("GET /terms", () => {
  it("returns a JSON terms array", async () => {
    const res = await fetch(`${baseUrl}/terms`);
    expect(res.status).toBe(200);
    const body = await res.json() as { terms: { id: string; label: string }[] };
    expect(Array.isArray(body.terms)).toBe(true);
    expect(body.terms.length).toBeGreaterThan(0);
  });

  it("includes a term id matching the current year", async () => {
    const res = await fetch(`${baseUrl}/terms`);
    const body = await res.json() as { terms: { id: string }[] };
    const currentYear = new Date().getFullYear().toString();
    expect(body.terms.some((t) => t.id.startsWith(currentYear))).toBe(true);
  });
});

describe("unknown routes", () => {
  it("returns JSON 404 for unknown GET paths", async () => {
    const res = await fetch(`${baseUrl}/nonexistent`);
    expect(res.status).toBe(404);
    const body = await res.json() as { error: string };
    expect(body.error).toBe("Not found");
  });

  it("returns JSON 404 content-type header", async () => {
    const res = await fetch(`${baseUrl}/also-unknown`);
    expect(res.headers.get("content-type")).toMatch(/application\/json/);
  });
});

describe("GET /terms/:termId/sections validation", () => {
  it("returns 400 with JSON error for bad termId format", async () => {
    const res = await fetch(`${baseUrl}/terms/bad/sections`);
    expect(res.status).toBe(400);
    const body = await res.json() as { error: string };
    expect(body.error).toMatch(/invalid termid/i);
  });

  it("returns 400 with JSON error for unknown dept", async () => {
    const res = await fetch(`${baseUrl}/terms/202601/sections?dept=ZZZZ`);
    expect(res.status).toBe(400);
    const body = await res.json() as { error: string };
    expect(body.error).toMatch(/unknown department/i);
  });
});

describe("GET /departments", () => {
  it("returns a JSON array of department codes", async () => {
    const res = await fetch(`${baseUrl}/departments`);
    expect(res.status).toBe(200);
    const body = await res.json() as { departments: string[] };
    expect(Array.isArray(body.departments)).toBe(true);
    expect(body.departments.length).toBeGreaterThan(0);
  });

  it("includes expected SEAS department codes", async () => {
    const res = await fetch(`${baseUrl}/departments`);
    const body = await res.json() as { departments: string[] };
    for (const dept of ["CSCI", "ECE", "BME", "MAE"]) {
      expect(body.departments).toContain(dept);
    }
  });
});

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

  it("wraps a semicolon-separated multi-instructor string as a single-element array", () => {
    // Per the type docs: "Smith, J; Doe, A" is stored as one string and wrapped
    // in a one-element array — the API does not split on semicolons.
    const section = toApiSection({ ...baseCourse, instructor: "Smith, J; Doe, A" });
    expect(section.instructors).toEqual(["Smith, J; Doe, A"]);
    expect(section.instructors).toHaveLength(1);
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
