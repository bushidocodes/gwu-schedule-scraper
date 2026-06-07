import fs from "fs";
import path from "path";

// import.meta.dirname is available in Node.js 21.2+ (engines require >=22)
const CACHE_DIR = path.join(import.meta.dirname, "..", "cache");
const CACHE_TTL_MS = parseInt(process.env.CACHE_TTL_MS ?? "", 10) || 60 * 60 * 1000;

function cacheFile(key: string): string {
  // Sanitize key for filesystem
  return path.join(CACHE_DIR, key.replace(/[^a-z0-9-]/gi, "_") + ".json");
}

export function getCached<T>(key: string): T | null {
  const file = cacheFile(key);
  try {
    const stat = fs.statSync(file);
    if (Date.now() - stat.mtimeMs > CACHE_TTL_MS) return null;
    return JSON.parse(fs.readFileSync(file, "utf-8")) as T;
  } catch {
    return null;
  }
}

export function setCached<T>(key: string, data: T): void {
  try {
    fs.mkdirSync(CACHE_DIR, { recursive: true });
    fs.writeFileSync(cacheFile(key), JSON.stringify(data));
  } catch (err) {
    // A write failure should not cause the caller to return an error response —
    // the data was fetched successfully; just log and carry on.
    console.error(`[cache] failed to write "${key}": ${(err as Error).message}`);
  }
}
