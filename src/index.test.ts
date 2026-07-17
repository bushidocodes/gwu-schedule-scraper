/**
 * CLI smoke tests — run src/index.ts as a child process so process.exit()
 * calls are isolated and don't abort the test runner.
 */
import { spawnSync } from "child_process";
import { fileURLToPath } from "url";
import { describe, expect, it } from "vitest";

const NODE = process.execPath;
const CLI = fileURLToPath(new URL("./index.ts", import.meta.url));
const FLAGS = ["--experimental-strip-types"];

function run(...args: string[]) {
  return spawnSync(NODE, [...FLAGS, CLI, ...args], {
    encoding: "utf-8",
    // Allow up to 20 s so network-calling subprocesses (FETCH_TIMEOUT_MS = 15 s)
    // have time to complete or time out before spawnSync kills them.
    timeout: 20_000,
  });
}

describe("CLI --help", () => {
  it("prints usage and exits 0 with --help", () => {
    const { stdout, status } = run("--help");
    expect(status).toBe(0);
    expect(stdout).toMatch(/Usage:/);
    expect(stdout).toMatch(/--term/);
    expect(stdout).toMatch(/--subject/);
  });

  it("prints usage and exits 0 with -h shorthand", () => {
    const { stdout, status } = run("-h");
    expect(status).toBe(0);
    expect(stdout).toMatch(/Usage:/);
  });
});

describe("CLI argument validation", () => {
  it("exits 1 with usage when --term is missing", () => {
    const { stderr, status } = run("--subject", "CSCI");
    expect(status).toBe(1);
    expect(stderr).toMatch(/Usage:/);
  });

  it("exits 1 with usage when --subject is missing", () => {
    const { stderr, status } = run("--term", "202601");
    expect(status).toBe(1);
    expect(stderr).toMatch(/Usage:/);
  });

  it("exits 1 with a clear message for a bad term ID format", () => {
    const { stderr, status } = run("--term", "BADTERM", "--subject", "CSCI");
    expect(status).toBe(1);
    expect(stderr).toMatch(/invalid term ID/i);
    // Should not attempt a network request
    expect(stderr).not.toMatch(/HTTP/);
  });

  it("exits 1 with a clear message for an invalid subject", () => {
    const { stderr, status } = run("--term", "202601", "--subject", "123INVALID");
    expect(status).toBe(1);
    expect(stderr).toMatch(/invalid subject/i);
  });

  it("exits 1 with a clear message for a non-numeric campus", () => {
    const { stderr, status } = run("--term", "202601", "--subject", "CSCI", "--campus", "abc");
    expect(status).toBe(1);
    expect(stderr).toMatch(/invalid campus/i);
  });

  it("normalises subject to uppercase before fetching", () => {
    // Confirm a lowercase subject passes validation and reaches the network call.
    // We only check that the validation error is NOT emitted — the process may
    // succeed (status 0), fail with a network error (status 1), or be killed by
    // the subprocess timeout (status null) if GWU is slow to respond.
    const { stderr, status } = run("--term", "202601", "--subject", "csci");
    expect(stderr).not.toMatch(/invalid subject/i);
    expect([0, 1, null]).toContain(status);
  });
});
