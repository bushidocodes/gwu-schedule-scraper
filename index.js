import jsdom from "jsdom";
import fetch from "node-fetch";
import fs from "fs";
const { JSDOM } = jsdom;

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
  const response = await fetch(
    "https://my.gwu.edu/mod/pws/print.cfm?campId=1&termId=202101&subjId=CSCI"
  );

  const text = await response.text();

  const dom = new JSDOM(text);
  let courseNodes = dom.window.document.querySelectorAll("table");

  for (let courseNode of courseNodes) {
    let rows = courseNode.querySelectorAll("tr");
    let mainRow = rows[0];
    let cells = mainRow.querySelectorAll("td");
    let status = cells[0].textContent;
    if (status !== "OPEN" && status !== "CLOSED") continue;

    let crn = Number.parseInt(cells[1].textContent);
    let subject = cells[2].textContent;

    // A section can be prepended by a letter of some kind. i.e. O10
    let section = cells[3].textContent;
    let name = cells[4].textContent;
    // Credits can be a range of values or ARR
    let credit = cells[5].textContent.trim();
    let instructor = cells[6].textContent.trim();
    let locationRaw = cells[7].textContent;
    let dayTimeRaw = cells[8].textContent;
    let fromTo = cells[9].textContent;
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
