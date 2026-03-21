import { readFile } from "node:fs/promises";
import path from "node:path";

interface AdminDocCard {
  id: string;
  eyebrow: string;
  title: string;
  body: string;
}

const repoRoot = path.resolve(process.cwd(), "..", "..");

function stripMarkdown(value: string) {
  return value
    .replace(/[`*_#>-]/g, "")
    .replace(/\[(.*?)\]\((.*?)\)/g, "$1")
    .trim();
}

function pickSummary(markdown: string) {
  const lines = markdown
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  const candidate = lines.find((line) => !line.startsWith("#") && !line.startsWith("##")) ?? "";

  return stripMarkdown(candidate);
}

async function loadDocCard({
  id,
  eyebrow,
  relativePath
}: {
  id: string;
  eyebrow: string;
  relativePath: string;
}): Promise<AdminDocCard> {
  const absolutePath = path.join(repoRoot, relativePath);
  const markdown = await readFile(absolutePath, "utf8");

  return {
    id,
    eyebrow,
    title: relativePath,
    body: pickSummary(markdown)
  };
}

export async function loadPolicyCards() {
  return Promise.all([
    loadDocCard({
      id: "review-policy",
      eyebrow: "Review",
      relativePath: "docs/ref/REVIEW-POLICY.md"
    }),
    loadDocCard({
      id: "source-tier",
      eyebrow: "Source tier",
      relativePath: "docs/ref/SOURCE-TIER-POLICY.md"
    }),
    loadDocCard({
      id: "publish-rules",
      eyebrow: "Publish",
      relativePath: "docs/ref/AUTO-PUBLISH-RULES.md"
    })
  ]);
}

export async function loadProgramCards() {
  return Promise.all([
    loadDocCard({
      id: "brief-program",
      eyebrow: "Brief program",
      relativePath: "docs/ref/programs/brief.program.md"
    }),
    loadDocCard({
      id: "discover-program",
      eyebrow: "Discover program",
      relativePath: "docs/ref/programs/discover.program.md"
    }),
    loadDocCard({
      id: "publish-program",
      eyebrow: "Publish program",
      relativePath: "docs/ref/programs/publish.program.md"
    }),
    loadDocCard({
      id: "source-policy",
      eyebrow: "Source policy",
      relativePath: "docs/ref/programs/source.policy.md"
    })
  ]);
}
