import { writeFileSync } from "fs";
import { parseArgs } from "util";
import { parseCourses } from "./parser.ts";
import { fetchSchedule } from "./scraper.ts";
import { isValidTermId, toErrorMessage } from "./utils.ts";

const USAGE = `Usage: node src/index.ts --term <termId> --subject <subjId> [--campus <campId>] [--output <file>] [--pretty]
  e.g. node src/index.ts --term 202503 --subject CSCI
       node src/index.ts --term 202503 --subject CSCI --output courses.json --pretty

Options:
  -t, --term     Term ID in YYYYSS format (01=Spring, 02=Summer, 03=Fall)
  -s, --subject  Department subject code (e.g. CSCI, ECE, BME)
  -c, --campus   Campus ID (default: 1)
  -o, --output   Write JSON to this file instead of stdout
  -p, --pretty   Pretty-print the JSON output
  -h, --help     Show this help message`;

async function main(): Promise<void> {
  let term: string | undefined;
  let subject: string | undefined;
  let campus = "1"; // overridden by --campus flag if provided
  let output: string | undefined;
  let pretty = false;

  try {
    const { values } = parseArgs({
      options: {
        term: { type: "string", short: "t" },
        subject: { type: "string", short: "s" },
        campus: { type: "string", short: "c", default: "1" },
        output: { type: "string", short: "o" },
        pretty: { type: "boolean", short: "p", default: false },
        help: { type: "boolean", short: "h", default: false },
      },
    });
    if (values.help) {
      process.stdout.write(USAGE + "\n");
      process.exit(0);
    }
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

  if (!isValidTermId(term)) {
    console.error(
      `Error: invalid term ID "${term}". Expected format YYYYSS where SS is 01 (Spring), 02 (Summer), or 03 (Fall). E.g. 202601`,
    );
    process.exit(1);
  }

  // Validate subject is a non-empty string of letters (catches accidental empty-string or numeric values)
  if (!/^[A-Za-z]{1,10}$/.test(subject.trim())) {
    console.error(
      `Error: invalid subject "${subject}". Expected a department code like CSCI, ECE, or BME.`,
    );
    process.exit(1);
  }
  subject = subject.trim().toUpperCase();

  // Validate campus is a positive integer (GWU uses numeric campus IDs)
  if (!/^[0-9]+$/.test(campus)) {
    console.error(`Error: invalid campus "${campus}". Expected a positive integer (default: 1).`);
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
    console.warn(`Warning: no courses found for term=${term} subject=${subject} campus=${campus}`);
  }

  const json = pretty ? JSON.stringify(courses, null, 2) : JSON.stringify(courses);

  if (output) {
    try {
      writeFileSync(output, json + "\n");
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
