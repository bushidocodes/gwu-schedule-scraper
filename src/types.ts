/**
 * A single meeting slot for a course section.
 *
 * `startTime` and `endTime` are `null` for asynchronous / fully-online
 * sections that have no scheduled meeting time.  The REST API layer coerces
 * these to empty strings (`""`) before sending them to clients.
 */
export interface Schedule {
  location: string;
  day: string;
  startTime: string | null;
  endTime: string | null;
}

/**
 * A parsed course section as returned by the GWU schedule scraper.
 *
 * Note: `instructor` is a single raw string scraped from the HTML cell.
 * Multiple instructors appear as a semicolon-separated list (e.g.
 * `"Smith, J; Doe, A"`).  The REST API wraps this in a one-element
 * `instructors` array rather than splitting it.
 */
export interface Course {
  crn: number;
  department: string;
  /** `NaN` when the subject cell contains only a department code with no course number. */
  courseID: number;
  section: string;
  name: string;
  credit: string;
  instructor: string;
  schedule: Schedule[];
  startDate: string;
  endDate: string;
}
