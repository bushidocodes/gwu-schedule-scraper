import fs from "fs";
import { parseArgs } from "util";
import { fetchSchedule } from "./scraper.ts";
import { parseCourses } from "./parser.ts";
import { toErrorMessage } from "./utils.ts";

const USAGE = `Usage: node src/index.ts --term <termId> --subject <subjId> [--campus <campId>] [--output <file>] [--pretty]
  e.g. node src/index.ts --term 202503 --subject CSCI
       node src/index.ts --term 202503 --subject CSCI --output courses.json --pretty`;

async function main(): Promise<void> {
  let term: string | undefined;
  let subject: string | undefined;
  let campus = "1"; // overridden by --campus flag if provided
  let output: string | undefined;
  let pretty = false;

  try {
    const { values } = parseArgs({
      options: {
        term:    { type: "string",  short: "t" },
        subject: { type: "string",  short: "s" },
        campus:  { type: "string",  short: "c", default: "1" },
        output:  { type: "string",  short: "o" },
        pretty:  { type: "boolean", short: "p", default: false },
      },
    });
    term = values.term;
    subject = values.subject;
    campus = values.campus ?? "1";
    output = values.output;
    pretty = values.pretty ?? false;
  } catch (err) {
    console.error(`Error: ${toErrorMessage(err)}`);
    console.error(USAGE);
    process.exit(1);
  }

  if (!term || !subject) {
    console.error(USAGE);
    process.exit(1);
  }

  let html: string;
  try {
    html = await fetchSchedule(term, subject, campus);
  } catch (err) {
    console.error(toErrorMessage(err));
    process.exit(1);
  }

  const courses = parseCourses(html);

  if (courses.length === 0) {
    console.error(`Warning: no courses found for term=${term} subject=${subject} campus=${campus}`);
  }

  const json = pretty ? JSON.stringify(courses, null, 2) : JSON.stringify(courses);

  if (output) {
    try {
      fs.writeFileSync(output, json);
    } catch (err) {
      console.error(`Failed to write to ${output}: ${toErrorMessage(err)}`);
      process.exit(1);
    }
  } else {
    process.stdout.write(json + "\n");
  }
}

main().catch((err) => {
  console.error(`Unexpected error: ${toErrorMessage(err)}`);
  process.exit(1);
});
