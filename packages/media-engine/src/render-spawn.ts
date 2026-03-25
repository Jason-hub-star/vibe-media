/** Cross-platform Remotion CLI spawn wrapper. */

import { spawn } from "child_process";

export interface RemotionRenderOptions {
  compositionId: string;
  outputPath: string;
  inputProps: Record<string, unknown>;
  entryPoint?: string;
  codec?: string;
  cwd?: string;
}

export function runRemotionRender(options: RemotionRenderOptions): Promise<void> {
  const { compositionId, outputPath, inputProps, entryPoint = "src/remotion/index.ts", codec = "h264", cwd = process.cwd() } = options;

  const remotionArgs = ["remotion", "render", entryPoint, compositionId, outputPath, `--codec=${codec}`, "--props", JSON.stringify(inputProps)];
  const command = process.platform === "win32" ? "cmd.exe" : "npx";
  const args = process.platform === "win32" ? ["/c", "npx", ...remotionArgs] : remotionArgs;

  return new Promise<void>((resolve, reject) => {
    let stderr = "";
    const child = spawn(command, args, { cwd, stdio: ["ignore", "pipe", "pipe"], env: process.env });
    child.stderr.on("data", (chunk: Buffer) => { if (stderr.length < 100_000) stderr += chunk.toString(); });
    child.on("close", (code) => { code === 0 ? resolve() : reject(new Error(`Remotion render exited with code ${code}: ${stderr.slice(0, 500)}`)); });
    child.on("error", reject);
  });
}
