import fs from "fs";
import { parseArgs } from "util";
import { fetchSchedule } from "./scraper.ts";
import { parseCourses } from "./parser.ts";

const USAGE = `Usage: node src/index.ts --term <termId> --subject <subjId> [--campus <campId>] [--output <file>]
  e.g. node src/index.ts --term 202503 --subject CSCI
       node src/index.ts --term 202503 --subject CSCI --output courses.json`;

async function main(): Promise<void> {
  let values: { term?: string; subject?: string; campus?: string; output?: string };
  try {
    ({ values } = parseArgs({
      options: {
        term:    { type: "string", short: "t" },
        subject: { type: "string", short: "s" },
        campus:  { type: "string", short: "c", default: "1" },
        output:  { type: "string", short: "o" },
      },
    }));
  } catch (err) {
    console.error(`Error: ${(err as Error).message}`);
    console.error(USAGE);
    process.exit(1);
  }

  const { term, subject, campus, output } = values!;

  if (!term || !subject) {
    console.error(USAGE);
    process.exit(1);
  }

  let html: string;
  try {
    html = await fetchSchedule(term, subject, campus!);
  } catch (err) {
    console.error((err as Error).message);
    process.exit(1);
  }

  const courses = parseCourses(html!);

  if (courses.length === 0) {
    console.error(`Warning: no courses found for term=${term} subject=${subject} campus=${campus}`);
  }

  const json = JSON.stringify(courses);

  if (output) {
    try {
      fs.writeFileSync(output, json);
    } catch (err) {
      console.error(`Failed to write to ${output}: ${(err as Error).message}`);
      process.exit(1);
    }
  } else {
    process.stdout.write(json + "\n");
  }
}

main().catch((err) => {
  console.error(`Unexpected error: ${(err as Error).message}`);
  process.exit(1);
});
