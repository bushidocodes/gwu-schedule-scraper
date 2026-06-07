/**
 * Safely extracts a human-readable message from an unknown thrown value.
 *
 * TypeScript catch clauses type `err` as `unknown`, so casting directly to
 * `Error` is unsafe — anything can be thrown.  This helper returns
 * `err.message` when `err` is an `Error` instance and `String(err)` otherwise.
 */
export function toErrorMessage(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}

/**
 * Returns true when `id` matches the GWU term ID format: four digits followed
 * by `01` (Spring), `02` (Summer), or `03` (Fall).  E.g. `"202601"`.
 *
 * Kept in `src/` so it can be used by both the CLI (`src/index.ts`) and the
 * API server (`api/terms.ts`) without creating a circular package dependency.
 */
export function isValidTermId(id: string): boolean {
  return /^\d{4}(?:01|02|03)$/.test(id);
}
