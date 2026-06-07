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
  const currentYear = new Date().getFullYear();
  for (let year = currentYear - 1; year <= currentYear + 2; year++) {
    for (const [code, label] of Object.entries(SEMESTER_LABELS)) {
      terms.push({ id: `${year}${code}`, label: `${label} ${year}` });
    }
  }
  // Most recent first
  return terms.reverse();
}

export function isValidTermId(id: string): boolean {
  return /^\d{4}(?:01|02|03)$/.test(id);
}
