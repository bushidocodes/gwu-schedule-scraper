import fs from "fs";
import path from "path";
import { toErrorMessage } from "../src/utils.ts";

/** Public interface of a cache instance returned by {@link createCache}. */
export interface CacheInstance {
  getCached<T>(key: string): T | null;
  setCached<T>(key: string, data: T): void;
}

/**
 * Returns a cache instance that stores serialised JSON files under `dir`
 * and expires entries after `ttlMs` milliseconds.
 *
 * Exported so tests can point the cache at a temporary directory without
 * touching the real cache or mocking the filesystem.
 */
export function createCache(dir: string, ttlMs: number): CacheInstance {
  function cacheFile(key: string): string {
    // Sanitize the key so it is always a safe filesystem path component.
    return path.join(dir, key.replace(/[^a-z0-9-]/gi, "_") + ".json");
  }

  function getCached<T>(key: string): T | null {
    const file = cacheFile(key);
    try {
      const stat = fs.statSync(file);
      if (Date.now() - stat.mtimeMs > ttlMs) return null;
      const raw = fs.readFileSync(file, "utf-8");
      try {
        return JSON.parse(raw) as T;
      } catch (parseErr) {
        console.error(`[cache] malformed JSON in "${key}" — ignoring: ${toErrorMessage(parseErr)}`);
        return null;
      }
    } catch {
      // File missing or unreadable — cache miss
      return null;
    }
  }

  function setCached<T>(key: string, data: T): void {
    // A write failure should not cause the caller to return an error response —
    // the data was fetched successfully; log and carry on.
    try {
      fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(cacheFile(key), JSON.stringify(data));
    } catch (err) {
      console.error(`[cache] failed to write "${key}": ${toErrorMessage(err)}`);
    }
  }

  return { getCached, setCached };
}

// ---------- module-level singleton used by the API server ----------

// import.meta.dirname is available in Node.js 21.2+ (engines require >=22)
const CACHE_DIR = path.join(import.meta.dirname, "..", "cache");

const rawTtl = parseInt(process.env.CACHE_TTL_MS ?? "", 10);
if (process.env.CACHE_TTL_MS !== undefined && (Number.isNaN(rawTtl) || rawTtl <= 0)) {
  console.warn(`[cache] CACHE_TTL_MS="${process.env.CACHE_TTL_MS}" is not a positive integer — using default 1 hour`);
}
const CACHE_TTL_MS = Number.isFinite(rawTtl) && rawTtl > 0 ? rawTtl : 60 * 60 * 1000;

const { getCached, setCached } = createCache(CACHE_DIR, CACHE_TTL_MS);
export { getCached, setCached };
