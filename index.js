import { load } from "cheerio";
import fs from "fs";
import { parseArgs } from "util";

let courses = [];

// Returns a tuple of [department, course_id]
const normalize_subject = (input) => {
  let result = input.trim().split(/\s+/g);
  result[0] = result[0].trim();
  result[1] = parseInt(result[1]);
  return result;
};

const parseDayTimes = (dayTimesRaw, locationsRaw) => {
  // For some reason, a course listing might show multiple entries
  let dayTimes = dayTimesRaw.split("AND");
  let locations = locationsRaw.split("AND");

  if (dayTimes.length != locations.length) {
    console.error("daytimes and locations did not have same number of tokens");
  }

  let joinedValues = dayTimes.map(
    (daytime, idx) => `${daytime}&${locations[idx]}`
  );

  let results = [];

  Array.from(new Set(joinedValues)).forEach((str) => {
    let [daytime, location] = str.split("&").map((tok) => tok.trim());

    // Days
    let days = daytime.match(/^[MTWRF]+/g);
    days = (days && days[0]) || "";
    days = days.split("");

    //Times
    const time = daytime.match(/\d\d:\d\d[APM]+/g);
    const startTime = (time && time[0]) || null;
    const endTime = (time && time[1]) || null;

    for (let day of days) {
      results.push({ location, day, startTime, endTime });
    }
  });

  return results;
};

// Returns a tuple of [startDate, endDate]
function parseFromTo(input) {
  return input.split("-").map((token) => token.trim());
}

async function main() {
  const { values } = parseArgs({
    options: {
      term:    { type: "string", short: "t" },
      subject: { type: "string", short: "s" },
      campus:  { type: "string", short: "c", default: "1" },
    },
  });

  const { term, subject, campus } = values;

  if (!term || !subject) {
    console.error("Usage: node index.js --term <termId> --subject <subjId> [--campus <campId>]");
    console.error("  e.g. node index.js --term 202101 --subject CSCI");
    process.exit(1);
  }

  const url = `https://my.gwu.edu/mod/pws/print.cfm?campId=${campus}&termId=${term}&subjId=${subject}`;
  const response = await fetch(url);

  const text = await response.text();

  const $ = load(text);

  for (let courseNode of $("table").toArray()) {
    const cells = $(courseNode).find("tr").eq(0).find("td");
    let status = cells.eq(0).text();
    if (status !== "OPEN" && status !== "CLOSED") continue;

    let crn = Number.parseInt(cells.eq(1).text());
    let subject = cells.eq(2).text();
    let section = cells.eq(3).text();
    let name = cells.eq(4).text();
    let credit = cells.eq(5).text().trim();
    let instructor = cells.eq(6).text().trim();
    let locationRaw = cells.eq(7).text();
    let dayTimeRaw = cells.eq(8).text();
    let fromTo = cells.eq(9).text();
    let [department, courseID] = normalize_subject(subject);
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

  fs.writeFileSync("./test.json", JSON.stringify(courses));
}

main();
