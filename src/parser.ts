import { load } from "cheerio";
import type { Course, Schedule } from "./types.ts";

/**
 * Splits a GWU subject cell (e.g. `"CSCI 1011"`) into `[department, courseID]`.
 * Logs an error and returns `NaN` as the course ID when the number is absent.
 */
export const normalizeSubject = (input: string): [string, number] => {
  const parts = input.trim().split(/\s+/);
  const courseID = Number.parseInt(parts[1], 10);
  if (Number.isNaN(courseID)) {
    console.error(`normalizeSubject: could not parse course ID from "${input}"`);
  }
  return [parts[0].trim(), courseID];
};

/**
 * Parses the raw day-time and location strings from the GWU schedule HTML
 * into an array of `Schedule` entries — one per meeting day.
 *
 * Multiple schedule blocks are separated by the literal string `"AND"`.
 * Duplicate `(daytime, location)` pairs are silently de-duplicated via `Set`
 * to avoid emitting redundant entries when the upstream HTML repeats a block.
 */
export const parseDayTimes = (dayTimesRaw: string, locationsRaw: string): Schedule[] => {
  // A course listing may show multiple schedule entries separated by AND
  const dayTimes = dayTimesRaw.split("AND");
  const locations = locationsRaw.split("AND");

  if (dayTimes.length !== locations.length) {
    console.error("daytimes and locations did not have same number of tokens");
  }

  const joinedValues = dayTimes.map((daytime, idx) => `${daytime}\x00${locations[idx] ?? ""}`);
  const results: Schedule[] = [];

  for (const str of new Set(joinedValues)) {
    const [daytime, location] = str.split("\x00").map((tok) => tok.trim());

    const days = daytime.match(/^[MTWRF]+/);
    const dayChars = ((days && days[0]) || "").split("");

    const time = daytime.match(/\d\d:\d\d(?:AM|PM)/g);
    const startTime = (time && time[0]) || null;
    const endTime = (time && time[1]) || null;

    for (const day of dayChars) {
      results.push({ location, day, startTime, endTime });
    }
  }

  return results;
};

/**
 * Splits a `"MM/DD/YY-MM/DD/YY"` date-range cell into `[startDate, endDate]`.
 * Logs an error and returns `["<input>", ""]` when the hyphen separator is absent.
 */
export const parseFromTo = (input: string): [string, string] => {
  const parts = input.split("-").map((token) => token.trim());
  if (parts.length < 2 || !parts[1]) {
    console.error(`parseFromTo: unexpected format "${input}"`);
    return [parts[0] ?? "", ""];
  }
  return [parts[0], parts[1]];
};

export function parseCourses(html: string): Course[] {
  const $ = load(html);
  const courses: Course[] = [];

  for (const courseNode of $("table").toArray()) {
    const cells = $(courseNode).find("tr").eq(0).find("td");
    const status = cells.eq(0).text();
    if (status !== "OPEN" && status !== "CLOSED") continue;

    const crn = Number.parseInt(cells.eq(1).text(), 10);
    const subjectText = cells.eq(2).text();
    const section = cells.eq(3).text().trim();
    const name = cells.eq(4).text().trim();
    const credit = cells.eq(5).text().trim();
    const instructor = cells.eq(6).text().trim();
    const locationRaw = cells.eq(7).text();
    const dayTimeRaw = cells.eq(8).text();
    const fromTo = cells.eq(9).text();

    const [department, courseID] = normalizeSubject(subjectText);
    const schedule = parseDayTimes(dayTimeRaw, locationRaw);
    const [startDate, endDate] = parseFromTo(fromTo);

    courses.push({ crn, department, courseID, section, name, credit, instructor, schedule, startDate, endDate });
  }

  return courses;
}
