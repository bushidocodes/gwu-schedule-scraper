import express from "express";
import { fetchSchedule } from "../src/scraper.ts";
import { parseCourses } from "../src/parser.ts";
import type { Course } from "../src/types.ts";
import { getTerms, isValidTermId } from "./terms.ts";
import { getCached, setCached } from "./cache.ts";

const DEPARTMENTS = ["BME", "CE", "CSCI", "ECE", "EMSE", "MAE"];
const DEFAULT_CAMPUS = "1";
const PORT = parseInt(process.env.PORT ?? "", 10) || 3000;

// Maps Course (singular instructor, nullable times) to the shape the Android app expects
interface ApiSection {
  crn: number;
  department: string;
  courseID: number;
  section: string;
  name: string;
  credit: string;
  instructors: string[];
  schedule: { location: string; day: string; startTime: string; endTime: string }[];
  startDate: string;
  endDate: string;
}

export function toApiSection(course: Course): ApiSection {
  // Destructure `instructor` out so it is not leaked into the API response alongside `instructors`
  const { instructor, schedule, ...rest } = course;
  return {
    ...rest,
    instructors: instructor ? [instructor] : [],
    schedule: schedule.map((s) => ({
      location: s.location,
      day: s.day,
      startTime: s.startTime ?? "",
      endTime: s.endTime ?? "",
    })),
  };
}

async function fetchDept(termId: string, dept: string): Promise<ApiSection[]> {
  const cacheKey = `${termId}-${dept}`;
  const cached = getCached<ApiSection[]>(cacheKey);
  if (cached) {
    console.log(`[cache hit] ${cacheKey}`);
    return cached;
  }
  console.log(`[scraping] term=${termId} dept=${dept}`);
  const html = await fetchSchedule(termId, dept, DEFAULT_CAMPUS);
  const courses = parseCourses(html);
  const sections = courses.map(toApiSection);
  setCached(cacheKey, sections);
  return sections;
}

const app = express();

// CORS for all origins (personal/dev API)
app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  if (req.method === "OPTIONS") {
    res.sendStatus(204);
    return;
  }
  next();
});

// GET /terms
app.get("/terms", (req, res) => {
  res.json({ terms: getTerms() });
});

// GET /terms/:termId/sections[?dept=CSCI]
app.get("/terms/:termId/sections", async (req, res) => {
  const { termId } = req.params;
  const dept = (req.query.dept as string | undefined)?.toUpperCase();

  if (!isValidTermId(termId)) {
    res.status(400).json({ error: `Invalid termId: ${termId}. Expected format YYYYSS (e.g. 202601)` });
    return;
  }

  if (dept && !DEPARTMENTS.includes(dept)) {
    res.status(400).json({ error: `Unknown department: ${dept}. Supported: ${DEPARTMENTS.join(", ")}` });
    return;
  }

  try {
    let sections: ApiSection[];
    if (dept) {
      sections = await fetchDept(termId, dept);
    } else {
      // Fetch all departments in parallel and dedupe by CRN
      const results = await Promise.allSettled(DEPARTMENTS.map((d) => fetchDept(termId, d)));
      results.forEach((r, i) => {
        if (r.status === "rejected") {
          console.error(`[error] dept=${DEPARTMENTS[i]} term=${termId}: ${(r.reason as Error).message}`);
        }
      });
      const combined = results
        .filter((r): r is PromiseFulfilledResult<ApiSection[]> => r.status === "fulfilled")
        .flatMap((r) => r.value);
      const seen = new Set<number>();
      sections = combined.filter((s) => {
        if (seen.has(s.crn)) return false;
        seen.add(s.crn);
        return true;
      });
    }
    res.json({ sections });
  } catch (err) {
    const msg = (err as Error).message;
    console.error(`[error] ${msg}`);
    res.status(502).json({ error: `Failed to fetch from GWU: ${msg}` });
  }
});

// Catch-all: unknown routes return JSON 404 instead of Express's default HTML response
app.use((_req, res) => {
  res.status(404).json({ error: "Not found" });
});

// Only start the server when this file is the entry point, not when imported by tests.
// import.meta.filename is available in Node.js 21.2+ (engines require >=22)
if (import.meta.filename === process.argv[1]) {
  app.listen(PORT, () => {
    console.log(`gwu-schedule-api listening on http://localhost:${PORT}`);
    console.log(`Endpoints:`);
    console.log(`  GET /terms`);
    console.log(`  GET /terms/:termId/sections`);
    console.log(`  GET /terms/:termId/sections?dept=CSCI`);
  });
}

export { app };
