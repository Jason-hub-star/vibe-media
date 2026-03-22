import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, "../../../..");
const initialEnvKeys = new Set(Object.keys(process.env));

function parseEnvFile(content: string) {
  const entries: Array<{ key: string; value: string }> = [];

  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;

    const separatorIndex = line.indexOf("=");
    if (separatorIndex <= 0) continue;

    const key = line.slice(0, separatorIndex).trim();
    let value = line.slice(separatorIndex + 1).trim();

    if (
      (value.startsWith(`"`) && value.endsWith(`"`)) ||
      (value.startsWith(`'`) && value.endsWith(`'`))
    ) {
      value = value.slice(1, -1);
    }

    entries.push({ key, value });
  }

  return entries;
}

function loadFile(relativePath: string, allowOverride = false) {
  const filePath = path.join(repoRoot, relativePath);
  if (!existsSync(filePath)) return;

  const content = readFileSync(filePath, "utf8");
  for (const { key, value } of parseEnvFile(content)) {
    if (initialEnvKeys.has(key)) continue;
    if (!allowOverride && key in process.env) continue;
    process.env[key] = value;
  }
}

loadFile(".env");
loadFile(".env.local", true);
