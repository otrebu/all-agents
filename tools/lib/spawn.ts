/**
 * Bun.spawn wrapper with execa-like API
 */

/* global Bun */

export interface SpawnOptions {
  cwd?: string;
  env?: Record<string, string | undefined>;
}

export interface SpawnResult {
  exitCode: number;
  stderr: string;
  stdout: string;
}

/**
 * Spawn a subprocess and return stdout, stderr, and exit code.
 * Unlike execa, this never throws on non-zero exit.
 */
export async function runCommand(
  cmd: Array<string>,
  options?: SpawnOptions,
): Promise<SpawnResult> {
  const proc = Bun.spawn(cmd, {
    cwd: options?.cwd,
    env: options?.env,
    stderr: "pipe",
    stdout: "pipe",
  });

  const [stdout, stderr, exitCode] = await Promise.all([
    new Response(proc.stdout).text(),
    new Response(proc.stderr).text(),
    proc.exited,
  ]);

  return { exitCode, stderr, stdout };
}
