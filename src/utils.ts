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
