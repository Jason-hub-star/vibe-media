/**
 * 공용 child_process.spawn Promise 래퍼.
 * render-spawn.ts, notebooklm-bridge.ts, whisper-stt.ts에서 반복되던 패턴 통합.
 */

import { spawn } from "child_process";

const DEFAULT_STDERR_LIMIT = 100_000;
const DEFAULT_STDOUT_LIMIT = 500_000;
const ERROR_SNIPPET_LENGTH = 500;

export interface SpawnAsyncOptions {
  cwd?: string;
  /** ms 단위 타임아웃 (0 = 없음) */
  timeout?: number;
  /** stdout 최대 바이트 (기본 500KB) */
  stdoutLimit?: number;
  /** stderr 최대 바이트 (기본 100KB) */
  stderrLimit?: number;
  /** 환경변수 (기본 process.env) */
  env?: NodeJS.ProcessEnv;
}

export interface SpawnAsyncResult {
  stdout: string;
  stderr: string;
  exitCode: number;
}

/**
 * spawn을 Promise로 래핑. stdout/stderr를 수집하고,
 * exit code 0이면 resolve, 아니면 reject.
 */
export function spawnAsync(
  command: string,
  args: string[],
  options?: SpawnAsyncOptions,
): Promise<SpawnAsyncResult> {
  return new Promise((resolve, reject) => {
    const stdoutLimit = options?.stdoutLimit ?? DEFAULT_STDOUT_LIMIT;
    const stderrLimit = options?.stderrLimit ?? DEFAULT_STDERR_LIMIT;
    let stdout = "";
    let stderr = "";
    let killed = false;

    const child = spawn(command, args, {
      cwd: options?.cwd ?? process.cwd(),
      stdio: ["ignore", "pipe", "pipe"],
      env: options?.env ?? process.env,
    });

    child.stdout.on("data", (chunk: Buffer) => {
      if (stdout.length < stdoutLimit) stdout += chunk.toString();
    });

    child.stderr.on("data", (chunk: Buffer) => {
      if (stderr.length < stderrLimit) stderr += chunk.toString();
    });

    if (options?.timeout && options.timeout > 0) {
      setTimeout(() => {
        killed = true;
        child.kill("SIGTERM");
        reject(new Error(`${command} timed out after ${options.timeout}ms`));
      }, options.timeout);
    }

    child.on("close", (code) => {
      if (killed) return;
      const exitCode = code ?? 1;
      if (exitCode === 0) {
        resolve({ stdout: stdout.trim(), stderr, exitCode });
      } else {
        reject(
          new Error(
            `${command} exited with code ${exitCode}: ${stderr.slice(0, ERROR_SNIPPET_LENGTH)}`,
          ),
        );
      }
    });

    child.on("error", (err) => {
      if (!killed) reject(err);
    });
  });
}

/**
 * 크로스플랫폼 npx 실행 (render-spawn.ts 패턴).
 * Windows: cmd.exe /c npx ...
 * Unix: npx ...
 */
export function spawnNpx(
  args: string[],
  options?: SpawnAsyncOptions,
): Promise<SpawnAsyncResult> {
  const command = process.platform === "win32" ? "cmd.exe" : "npx";
  const fullArgs =
    process.platform === "win32" ? ["/c", "npx", ...args] : args;
  return spawnAsync(command, fullArgs, options);
}
