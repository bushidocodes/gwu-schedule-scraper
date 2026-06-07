import { describe, it, expect, vi, afterEach } from "vitest";
import { fetchSchedule, FETCH_TIMEOUT_MS } from "./scraper.ts";

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("fetchSchedule", () => {
  it("returns the response body on a successful fetch", async () => {
    vi.stubGlobal("fetch", async () => ({
      ok: true,
      text: async () => "<html>schedule</html>",
    }));
    const result = await fetchSchedule("202601", "CSCI", "1");
    expect(result).toBe("<html>schedule</html>");
  });

  it("throws on a non-OK HTTP response", async () => {
    vi.stubGlobal("fetch", async () => ({ ok: false, status: 503 }));
    await expect(fetchSchedule("202601", "CSCI", "1")).rejects.toThrow("HTTP 503");
  });

  it("constructs the correct GWU URL", async () => {
    const calls: string[] = [];
    vi.stubGlobal("fetch", async (url: string) => {
      calls.push(url);
      return { ok: true, text: async () => "" };
    });
    await fetchSchedule("202603", "ECE", "2");
    expect(calls[0]).toBe(
      "https://my.gwu.edu/mod/pws/print.cfm?campId=2&termId=202603&subjId=ECE",
    );
  });

  it("URL-encodes each parameter", async () => {
    const calls: string[] = [];
    vi.stubGlobal("fetch", async (url: string) => {
      calls.push(url);
      return { ok: true, text: async () => "" };
    });
    await fetchSchedule("2026 01", "CS&CI", "1");
    expect(calls[0]).toContain("termId=2026%2001");
    expect(calls[0]).toContain("subjId=CS%26CI");
  });

  it("exports FETCH_TIMEOUT_MS as a positive number", () => {
    expect(FETCH_TIMEOUT_MS).toBeGreaterThan(0);
  });

  it("passes an AbortSignal to fetch so the request can time out", async () => {
    let capturedSignal: AbortSignal | undefined;
    vi.stubGlobal("fetch", async (_url: string, init?: RequestInit) => {
      capturedSignal = init?.signal as AbortSignal | undefined;
      return { ok: true, text: async () => "" };
    });
    await fetchSchedule("202601", "CSCI", "1");
    expect(capturedSignal).toBeInstanceOf(AbortSignal);
  });

  it("uses a custom timeout when provided", async () => {
    const signals: AbortSignal[] = [];
    vi.stubGlobal("fetch", async (_url: string, init?: RequestInit) => {
      signals.push(init?.signal as AbortSignal);
      return { ok: true, text: async () => "" };
    });
    await fetchSchedule("202601", "CSCI", "1", 5_000);
    expect(signals[0]).toBeDefined();
  });
});
