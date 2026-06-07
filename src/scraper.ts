const FETCH_TIMEOUT_MS = 15_000;

export async function fetchSchedule(
  term: string,
  subject: string,
  campus: string,
  timeoutMs: number = FETCH_TIMEOUT_MS,
): Promise<string> {
  const url = `https://my.gwu.edu/mod/pws/print.cfm?campId=${campus}&termId=${term}&subjId=${subject}`;
  const response = await fetch(url, { signal: AbortSignal.timeout(timeoutMs) });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status} from ${url}`);
  }

  return response.text();
}
