import fs, { mkdtempSync, rmSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { createCache } from "./cache.ts";

let dir: string;

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), "gwu-cache-test-"));
});

afterEach(() => {
  rmSync(dir, { recursive: true, force: true });
});

describe("getCached", () => {
  it("returns null for a key that was never written", () => {
    const { getCached } = createCache(dir, 3_600_000);
    expect(getCached("missing-key")).toBeNull();
  });

  it("returns the stored value for a fresh entry", () => {
    const { getCached, setCached } = createCache(dir, 3_600_000);
    setCached("k1", { value: 42, label: "hello" });
    expect(getCached("k1")).toEqual({ value: 42, label: "hello" });
  });

  it("round-trips an array of objects", () => {
    const { getCached, setCached } = createCache(dir, 3_600_000);
    const data = [{ a: 1 }, { a: 2 }];
    setCached("arr", data);
    expect(getCached("arr")).toEqual(data);
  });

  it("returns null for an entry whose TTL has elapsed", async () => {
    const { getCached, setCached } = createCache(dir, 1 /* 1 ms */);
    setCached("k2", "data");
    await new Promise((r) => setTimeout(r, 10));
    expect(getCached<string>("k2")).toBeNull();
  });

  it("returns data for an entry whose TTL has not elapsed", () => {
    const { getCached, setCached } = createCache(dir, 3_600_000);
    setCached("k3", "fresh");
    expect(getCached<string>("k3")).toBe("fresh");
  });
});

describe("setCached", () => {
  it("creates the cache directory if it does not exist", () => {
    const nested = join(dir, "a", "b", "c");
    const { setCached, getCached } = createCache(nested, 3_600_000);
    setCached("x", 99);
    expect(getCached<number>("x")).toBe(99);
  });

  it("overwrites a previously cached value", () => {
    const { getCached, setCached } = createCache(dir, 3_600_000);
    setCached("k", "first");
    setCached("k", "second");
    expect(getCached<string>("k")).toBe("second");
  });

  it("logs an error and does not throw when the directory cannot be created", () => {
    const { setCached } = createCache(dir, 3_600_000);
    const errors: string[] = [];
    // Simulate a filesystem failure by making mkdirSync throw
    const mkdirSpy = vi.spyOn(fs, "mkdirSync").mockImplementation(() => {
      throw new Error("EACCES: permission denied");
    });
    const errorSpy = vi.spyOn(console, "error").mockImplementation((msg: string) => errors.push(msg));
    expect(() => setCached("k", "data")).not.toThrow();
    mkdirSpy.mockRestore();
    errorSpy.mockRestore();
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0]).toMatch(/\[cache\] failed to write/);
  });

  it("sanitizes keys so they are safe filesystem path components", () => {
    const { getCached, setCached } = createCache(dir, 3_600_000);
    // Keys with special chars should still round-trip correctly
    setCached("term/2026 dept?CSCI", { ok: true });
    expect(getCached("term/2026 dept?CSCI")).toEqual({ ok: true });
  });
});

describe("getCached (malformed cache file)", () => {
  it("returns null and logs an error when the cache file contains invalid JSON", () => {
    const { getCached } = createCache(dir, 3_600_000);
    // Write a corrupted cache file directly
    const corruptFile = join(dir, "bad_key.json");
    fs.writeFileSync(corruptFile, "{ this is not valid json");
    const errors: string[] = [];
    const spy = vi.spyOn(console, "error").mockImplementation((msg: string) => errors.push(msg));
    const result = getCached("bad_key");
    spy.mockRestore();
    expect(result).toBeNull();
    expect(errors.length).toBe(1);
    expect(errors[0]).toMatch(/\[cache\] malformed JSON/);
  });
});
