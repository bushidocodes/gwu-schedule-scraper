import { load } from "cheerio";
import fs from "fs";
import { parseArgs } from "util";

interface Schedule {
  location: string;
  day: string;
  startTime: string | null;
  endTime: string | null;
}

interface Course {
  crn: number;
  department: string;
  courseID: number;
  section: string;
  name: string;
  credit: string;
  instructor: string;
  schedule: Schedule[];
  startDate: string;
  endDate: string;
}

let courses: Course[] = [];

// Returns a tuple of [department, course_id]
const normalize_subject = (input: string): [string, number] => {
  let result = input.trim().split(/\s+/g);
  result[0] = result[0].trim();
  return [result[0], parseInt(result[1])];
};

const parseDayTimes = (dayTimesRaw: string, locationsRaw: string): Schedule[] => {
  // For some reason, a course listing might show multiple entries
  let dayTimes = dayTimesRaw.split("AND");
  let locations = locationsRaw.split("AND");

  if (dayTimes.length != locations.length) {
    console.error("daytimes and locations did not have same number of tokens");
  }

  let joinedValues = dayTimes.map(
    (daytime, idx) => `${daytime}&${locations[idx]}`
  );

  let results: Schedule[] = [];

  Array.from(new Set(joinedValues)).forEach((str) => {
    let [daytime, location] = str.split("&").map((tok) => tok.trim());

    // Days
    let days = daytime.match(/^[MTWRF]+/g);
    let dayStr = (days && days[0]) || "";
    let dayChars = dayStr.split("");

    // Times
    const time = daytime.match(/\d\d:\d\d[APM]+/g);
    const startTime = (time && time[0]) || null;
    const endTime = (time && time[1]) || null;

    for (let day of dayChars) {
      results.push({ location, day, startTime, endTime });
    }
  });

  return results;
};

// Returns a tuple of [startDate, endDate]
function parseFromTo(input: string): [string, string] {
  const parts = input.split("-").map((token) => token.trim());
  return [parts[0], parts[1]];
}

async function main(): Promise<void> {
  let values: { term?: string; subject?: string; campus?: string };
  try {
    ({ values } = parseArgs({
      options: {
        term:    { type: "string", short: "t" },
        subject: { type: "string", short: "s" },
        campus:  { type: "string", short: "c", default: "1" },
      },
    }));
  } catch (err) {
    console.error(`Error: ${(err as Error).message}`);
    console.error("Usage: node index.ts --term <termId> --subject <subjId> [--campus <campId>]");
    process.exit(1);
  }

  const { term, subject, campus } = values!;

  if (!term || !subject) {
    console.error("Usage: node index.ts --term <termId> --subject <subjId> [--campus <campId>]");
    console.error("  e.g. node index.ts --term 202101 --subject CSCI");
    process.exit(1);
  }

  const url = `https://my.gwu.edu/mod/pws/print.cfm?campId=${campus}&termId=${term}&subjId=${subject}`;

  let response: Response;
  try {
    response = await fetch(url);
  } catch (err) {
    console.error(`Network error: ${(err as Error).message}`);
    process.exit(1);
  }

  if (!response!.ok) {
    console.error(`HTTP ${response!.status} from ${url}`);
    process.exit(1);
  }

  const text = await response!.text();
  const $ = load(text);

  for (let courseNode of $("table").toArray()) {
    const cells = $(courseNode).find("tr").eq(0).find("td");
    let status = cells.eq(0).text();
    if (status !== "OPEN" && status !== "CLOSED") continue;

    let crn = Number.parseInt(cells.eq(1).text());
    let subjectText = cells.eq(2).text();
    let section = cells.eq(3).text();
    let name = cells.eq(4).text();
    let credit = cells.eq(5).text().trim();
    let instructor = cells.eq(6).text().trim();
    let locationRaw = cells.eq(7).text();
    let dayTimeRaw = cells.eq(8).text();
    let fromTo = cells.eq(9).text();
    let [department, courseID] = normalize_subject(subjectText);
    let schedule = parseDayTimes(dayTimeRaw, locationRaw);
    let [startDate, endDate] = parseFromTo(fromTo);

    courses.push({
      crn,
      department,
      courseID,
      section,
      name,
      credit,
      instructor,
      schedule,
      startDate,
      endDate,
    });
  }

  if (courses.length === 0) {
    console.error(`Warning: no courses found for term=${term} subject=${subject} campus=${campus}`);
  }

  try {
    fs.writeFileSync("./test.json", JSON.stringify(courses));
  } catch (err) {
    console.error(`Failed to write output: ${(err as Error).message}`);
    process.exit(1);
  }
}

main().catch((err) => {
  console.error(`Unexpected error: ${(err as Error).message}`);
  process.exit(1);
});
