/** Cross-platform Remotion CLI spawn wrapper. */

import { spawnNpx } from "./spawn-async";

export interface RemotionRenderOptions {
  compositionId: string;
  outputPath: string;
  inputProps: Record<string, unknown>;
  entryPoint?: string;
  codec?: string;
  cwd?: string;
}

export async function runRemotionRender(options: RemotionRenderOptions): Promise<void> {
  const { compositionId, outputPath, inputProps, entryPoint = "src/remotion/index.tsx", codec = "h264", cwd } = options;

  await spawnNpx(
    ["remotion", "render", entryPoint, compositionId, outputPath, `--codec=${codec}`, "--props", JSON.stringify(inputProps)],
    { cwd },
  );
}
