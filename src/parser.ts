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
  // Fast path: both cells empty means no scheduled time (async/TBA section)
  if (!dayTimesRaw.trim() && !locationsRaw.trim()) return [];

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

/** The handful of HTML entities GWU's schedule printer actually emits. */
const NAMED_ENTITIES: Record<string, string> = {
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'",
  nbsp: " ",
  copy: "©",
};

/** Decodes named (`&amp;`) and numeric (`&#39;`, `&#x27;`) HTML entities. */
const decodeEntities = (input: string): string =>
  input.replace(/&(#x?[0-9a-f]+|[a-z]+);/gi, (match, entity: string) => {
    if (entity[0] === "#") {
      const codePoint =
        entity[1] === "x" || entity[1] === "X"
          ? Number.parseInt(entity.slice(2), 16)
          : Number.parseInt(entity.slice(1), 10);
      return Number.isNaN(codePoint) ? match : String.fromCodePoint(codePoint);
    }
    return NAMED_ENTITIES[entity] ?? match;
  });

/**
 * Removes HTML tags from a fragment by scanning character-by-character: every
 * run from a `<` to the next `>` (or end of input) is dropped. A single-pass
 * regex like `/<[^>]*>/g` would leave an unterminated `<tag` (no closing `>`)
 * intact, so the scan is used instead — it is more robust and concatenates the
 * remaining text exactly as cheerio's `.text()` did.
 */
const stripTags = (html: string): string => {
  let text = "";
  let inTag = false;
  for (const char of html) {
    if (char === "<") inTag = true;
    else if (char === ">") inTag = false;
    else if (!inTag) text += char;
  }
  return text;
};

/**
 * Extracts the visible text of a table cell, mirroring the behaviour the parser
 * previously relied on from cheerio's `.text()`: nested tags (e.g. `<span>`,
 * `<a>`, `<br>`) are stripped and HTML entities are decoded, concatenating all
 * descendant text. Whitespace is preserved; callers trim where needed.
 */
const cellText = (innerHtml: string): string => decodeEntities(stripTags(innerHtml));

/**
 * Parses the full HTML response from the GWU schedule printer into an array
 * of `Course` objects.  Each `<table>` whose first row starts with `"OPEN"` or
 * `"CLOSED"` is treated as a course row; all other tables are skipped.
 *
 * The GWU markup nests course tables inside layout tables, so — matching the
 * previous cheerio traversal — every `<table>` is visited and the first
 * descendant `<tr>` (and its `<td>` cells) is read; non-course tables fall out
 * via the OPEN/CLOSED status check.
 */
export const parseCourses = (html: string): Course[] => {
  const courses: Course[] = [];
  const tableOpen = /<table\b/gi;
  const trOpen = /<tr\b/i;
  const rowEnd = /<\/tr>/i;
  const cellMatch = /<td\b[^>]*>([\s\S]*?)<\/td>/gi;

  for (let table = tableOpen.exec(html); table !== null; table = tableOpen.exec(html)) {
    // First descendant <tr> after this table's opening tag.
    const afterTable = html.slice(table.index);
    const trStart = afterTable.search(trOpen);
    if (trStart < 0) continue;

    const rowHtml = afterTable.slice(trStart);
    const trEnd = rowHtml.search(rowEnd);
    const cellsHtml = trEnd < 0 ? rowHtml : rowHtml.slice(0, trEnd);

    const cells = [...cellsHtml.matchAll(cellMatch)].map((cell) => cellText(cell[1]));
    const status = cells[0] ?? "";
    if (status !== "OPEN" && status !== "CLOSED") continue;

    const crn = Number.parseInt(cells[1] ?? "", 10);
    const [department, courseID] = normalizeSubject(cells[2] ?? "");
    const section = (cells[3] ?? "").trim();
    const name = (cells[4] ?? "").trim();
    const credit = (cells[5] ?? "").trim();
    const instructor = (cells[6] ?? "").trim();
    const schedule = parseDayTimes(cells[8] ?? "", cells[7] ?? "");
    const [startDate, endDate] = parseFromTo(cells[9] ?? "");

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

  return courses;
};
