import fs from "fs";
import { parseArgs } from "util";
import { fetchSchedule } from "./scraper.ts";
import { parseCourses } from "./parser.ts";

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
    console.error("Usage: node src/index.ts --term <termId> --subject <subjId> [--campus <campId>]");
    process.exit(1);
  }

  const { term, subject, campus } = values!;

  if (!term || !subject) {
    console.error("Usage: node src/index.ts --term <termId> --subject <subjId> [--campus <campId>]");
    console.error("  e.g. node src/index.ts --term 202101 --subject CSCI");
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
