export interface Term {
  id: string;
  label: string;
}

const SEMESTER_LABELS: Record<string, string> = {
  "01": "Spring",
  "02": "Summer",
  "03": "Fall",
};

export function getTerms(): Term[] {
  const terms: Term[] = [];
  // Cover 2024 through 2027
  for (const year of [2024, 2025, 2026, 2027]) {
    for (const [code, label] of Object.entries(SEMESTER_LABELS)) {
      terms.push({ id: `${year}${code}`, label: `${label} ${year}` });
    }
  }
  // Most recent first
  return terms.reverse();
}

export function isValidTermId(id: string): boolean {
  return /^\d{4}(01|02|03)$/.test(id);
}
