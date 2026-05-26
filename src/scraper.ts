export async function fetchSchedule(term: string, subject: string, campus: string): Promise<string> {
  const url = `https://my.gwu.edu/mod/pws/print.cfm?campId=${campus}&termId=${term}&subjId=${subject}`;
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`HTTP ${response.status} from ${url}`);
  }

  return response.text();
}
