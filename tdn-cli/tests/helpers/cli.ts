import { spawn } from 'bun';
import { resolve } from 'path';

/**
 * Result from running the CLI
 */
export interface CliResult {
  stdout: string;
  stderr: string;
  exitCode: number;
}

// ANSI escape code regex for stripping colors
const ANSI_REGEX =
  // eslint-disable-next-line no-control-regex
  /[\u001b\u009b][[()#;?]*(?:[0-9]{1,4}(?:;[0-9]{0,4})*)?[0-9A-ORZcf-nqry=><]/g;

/**
 * Strip ANSI escape codes from a string
 */
export function stripAnsi(str: string): string {
  return str.replace(ANSI_REGEX, '');
}

/**
 * Run the CLI with the given arguments and return the result.
 * Output is automatically stripped of ANSI escape codes.
 *
 * @param args - Command line arguments (e.g., ['show', 'path/to/task.md'])
 * @returns Promise resolving to stdout, stderr, and exit code
 */
export async function runCli(args: string[]): Promise<CliResult> {
  const cliPath = resolve(import.meta.dir, '../../src/index.ts');

  const proc = spawn({
    cmd: ['bun', 'run', cliPath, ...args],
    cwd: resolve(import.meta.dir, '../..'),
    stdout: 'pipe',
    stderr: 'pipe',
  });

  const [stdoutBuffer, stderrBuffer] = await Promise.all([
    new Response(proc.stdout).text(),
    new Response(proc.stderr).text(),
  ]);

  const exitCode = await proc.exited;

  return {
    stdout: stripAnsi(stdoutBuffer),
    stderr: stripAnsi(stderrBuffer),
    exitCode,
  };
}

/**
 * Get the path to a test fixture file
 */
export function fixturePath(relativePath: string): string {
  return resolve(import.meta.dir, '../fixtures', relativePath);
}
