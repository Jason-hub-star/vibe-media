import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";

const rootDir = path.resolve(import.meta.dirname, "..");

function readJson(relativePath) {
  return JSON.parse(readFileSync(path.join(rootDir, relativePath), "utf8"));
}

function collectScripts() {
  const rootScripts = Object.keys(readJson("package.json").scripts ?? {});
  const backendScripts = Object.keys(readJson("apps/backend/package.json").scripts ?? {});
  return new Set([...rootScripts, ...backendScripts]);
}

function findMarkdownFiles(dir) {
  const queue = [path.join(rootDir, dir)];
  const files = [];

  while (queue.length > 0) {
    const current = queue.pop();
    for (const entry of readdirSync(current, { withFileTypes: true })) {
      const entryPath = path.join(current, entry.name);
      if (entry.isDirectory()) {
        queue.push(entryPath);
        continue;
      }
      if (entry.isFile() && entry.name.endsWith(".md")) {
        files.push(entryPath);
      }
    }
  }

  return files;
}

function relativeAutomationPath(filePath) {
  return path.relative(rootDir, filePath);
}

function isPathLikeReference(target) {
  return target.startsWith(".") || target.includes("/");
}

function resolveDocPaths(sourceFilePath, target) {
  const candidates = [path.resolve(path.dirname(sourceFilePath), target)];

  if (isPathLikeReference(target)) {
    candidates.push(path.resolve(rootDir, target));
  }

  return [...new Set(candidates)];
}

function fileExists(filePath) {
  try {
    readFileSync(filePath, "utf8");
    return true;
  } catch {
    return false;
  }
}

function collectProblems() {
  const scripts = collectScripts();
  const problems = [];

  for (const filePath of findMarkdownFiles(".claude/automations")) {
    const text = readFileSync(filePath, "utf8");
    const relativePath = relativeAutomationPath(filePath);

    for (const match of text.matchAll(/npm run ([a-z0-9:-]+)/gi)) {
      const scriptName = match[1];
      if (!scripts.has(scriptName)) {
        problems.push(`${relativePath}: missing script "${scriptName}"`);
      }
    }

    for (const match of text.matchAll(/`([^`]+\.(?:md|ts|sh|mjs))`/g)) {
      const target = match[1];
      if (target.includes(" ") || !isPathLikeReference(target)) {
        continue;
      }

      const targetPaths = resolveDocPaths(filePath, target);
      if (!targetPaths.some(fileExists)) {
        problems.push(`${relativePath}: referenced file missing "${target}"`);
      }
    }
  }

  return problems;
}

const problems = collectProblems();

if (problems.length > 0) {
  console.error("Automation sync check failed:");
  for (const problem of problems) {
    console.error(`- ${problem}`);
  }
  process.exit(1);
}

console.log("Automation sync check passed.");
